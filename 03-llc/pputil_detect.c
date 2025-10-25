// Enhanced cache parameter detection for Intel, AMD, and other CPUs
// Inspired by https://codepen.io/atoliks24/pen/GRRPzQm
// memorygrammer (PrimeProbe) but in c with multi-CPU support

#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <math.h>
#include <sys/time.h>
#include <immintrin.h>
#include <stdbool.h>
#include <string.h>
#include <unistd.h>

// Structure to hold cache parameters
typedef struct {
    uint32_t cache_size;      // LLC size in bytes
    uint32_t cache_assoc;     // Associativity
    uint32_t set_index_pos;   // Set index bit position
    uint32_t all_set_offset;  // All set offset
    uint32_t line_size;       // Cache line size
    char cpu_name[256];       // CPU name for reference
} CacheConfig;

// Default configuration (conservative fallback)
static CacheConfig cache_config = {
    .cache_size = 8 * 1024 * 1024,  // 8 MiB default
    .cache_assoc = 16,
    .set_index_pos = 6,
    .all_set_offset = 17,
    .line_size = 64,
    .cpu_name = "Unknown"
};

#define LINE_SIZE (cache_config.line_size)
#define CACHE_SIZE (cache_config.cache_size)
#define CACHE_LINES (CACHE_SIZE / LINE_SIZE)
#define CACHE_ASSOC (cache_config.cache_assoc)
#define SET_INDEX_POS (cache_config.set_index_pos)
#define CACHE_SETS (CACHE_LINES / CACHE_ASSOC)
#define ALL_SET_OFFSET (cache_config.all_set_offset)
#define SETS_PER_PAGE (4096 / LINE_SIZE)

#define SET_SKIPPING_STEP 1
#define BYTES_PER_MB (1024 * 1024)

uint32_t *evictionArray = NULL;
uint32_t *setHeads = NULL;
bool setHeadsCreated = false;
bool cacheDetected = false;

// Detect cache parameters from system
void detect_cache_config() {
    FILE *fp;
    char line[256];
    uint32_t llc_size = 0;
    
    // Try to read CPU info
    fp = fopen("/proc/cpuinfo", "r");
    if (fp) {
        while (fgets(line, sizeof(line), fp)) {
            if (strncmp(line, "model name", 10) == 0) {
                char *name_start = strchr(line, ':');
                if (name_start) {
                    name_start += 2; // Skip ": "
                    strncpy(cache_config.cpu_name, name_start, sizeof(cache_config.cpu_name) - 1);
                    // Remove newline
                    cache_config.cpu_name[strcspn(cache_config.cpu_name, "\n")] = 0;
                }
            }
        }
        fclose(fp);
    }
    
    // Detect LLC size using sysfs (Linux-specific)
    // Try different cache index values (usually index3 is LLC)
    for (int idx = 3; idx >= 0; idx--) {
        char path[256];
        snprintf(path, sizeof(path), "/sys/devices/system/cpu/cpu0/cache/index%d/size", idx);
        
        fp = fopen(path, "r");
        if (fp) {
            char size_str[64];
            if (fgets(size_str, sizeof(size_str), fp)) {
                // Parse size (format: "12288K" or "12M")
                uint32_t size_val;
                char unit;
                if (sscanf(size_str, "%u%c", &size_val, &unit) == 2) {
                    if (unit == 'K' || unit == 'k') {
                        llc_size = size_val * 1024;
                    } else if (unit == 'M' || unit == 'm') {
                        llc_size = size_val * 1024 * 1024;
                    }
                    
                    // Check if this is the last level cache
                    char level_path[256];
                    snprintf(level_path, sizeof(level_path), 
                            "/sys/devices/system/cpu/cpu0/cache/index%d/level", idx);
                    FILE *level_fp = fopen(level_path, "r");
                    if (level_fp) {
                        int level;
                        if (fscanf(level_fp, "%d", &level) == 1 && level >= 3) {
                            // This is LLC (L3 or higher)
                            cache_config.cache_size = llc_size;
                            fclose(level_fp);
                            break;
                        }
                        fclose(level_fp);
                    }
                }
            }
            fclose(fp);
        }
    }
    
    // Detect CPU vendor and apply heuristics
    bool is_amd = (strstr(cache_config.cpu_name, "AMD") != NULL || 
                   strstr(cache_config.cpu_name, "Ryzen") != NULL ||
                   strstr(cache_config.cpu_name, "EPYC") != NULL);
    bool is_intel = (strstr(cache_config.cpu_name, "Intel") != NULL);
    
    // Set associativity based on cache size and vendor
    if (is_amd) {
        // AMD Ryzen typically uses 16-way associative L3
        cache_config.cache_assoc = 16;
        cache_config.set_index_pos = 6;
        
        // Calculate all_set_offset based on cache size
        // all_set_offset = log2(cache_size / (ways * line_size))
        uint32_t sets = cache_config.cache_size / (cache_config.cache_assoc * 64);
        cache_config.all_set_offset = (uint32_t)log2(sets) + 6;
        
    } else if (is_intel) {
        // Intel typically uses 12-20 way associative L3
        if (cache_config.cache_size >= 16 * 1024 * 1024) {
            cache_config.cache_assoc = 20; // Newer Intel CPUs
        } else {
            cache_config.cache_assoc = 16; // Older Intel CPUs
        }
        cache_config.set_index_pos = 6;
        
        uint32_t sets = cache_config.cache_size / (cache_config.cache_assoc * 64);
        cache_config.all_set_offset = (uint32_t)log2(sets) + 6;
    } else {
        // Conservative defaults for unknown CPUs
        cache_config.cache_assoc = 16;
        cache_config.set_index_pos = 6;
        uint32_t sets = cache_config.cache_size / (cache_config.cache_assoc * 64);
        cache_config.all_set_offset = (uint32_t)log2(sets) + 6;
    }
    
    printf("[LLC Detection] CPU: %s\n", cache_config.cpu_name);
    printf("[LLC Detection] LLC Size: %.2f MiB\n", cache_config.cache_size / (1024.0 * 1024.0));
    printf("[LLC Detection] Associativity: %u-way\n", cache_config.cache_assoc);
    printf("[LLC Detection] Sets: %u\n", CACHE_SETS);
    printf("[LLC Detection] All-set offset: %u\n", cache_config.all_set_offset);
    
    cacheDetected = true;
}

// Initialize eviction arrays based on detected cache config
void init_eviction_arrays() {
    if (evictionArray == NULL) {
        // Allocate enough space for the eviction array
        evictionArray = (uint32_t*)calloc(64 * BYTES_PER_MB / 4, sizeof(uint32_t));
        if (evictionArray == NULL) {
            fprintf(stderr, "Failed to allocate eviction array\n");
            exit(1);
        }
    }
    
    if (setHeads == NULL) {
        setHeads = (uint32_t*)calloc(SETS_PER_PAGE, sizeof(uint32_t));
        if (setHeads == NULL) {
            fprintf(stderr, "Failed to allocate setHeads array\n");
            exit(1);
        }
    }
}

uint64_t perfNow()
{
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return ((uint64_t)(tv.tv_sec) * 1000000 + (uint64_t)(tv.tv_usec));
}

uint32_t *shuffle(uint32_t *arrayToShuffle, uint32_t length)
{
    uint32_t tmp, current, top = length;
    if (top)
        while (--top)
        {
            current = (uint32_t)((double)rand() / (double)RAND_MAX * (top + 1));
            tmp = arrayToShuffle[current];
            arrayToShuffle[current] = arrayToShuffle[top];
            arrayToShuffle[top] = tmp;
        }
    return arrayToShuffle;
}

void createSetHeads()
{
    if (!cacheDetected) {
        detect_cache_config();
    }
    
    if (setHeadsCreated)
        return;
        
    init_eviction_arrays();
    
    uint32_t sets = CACHE_SETS;
    uint32_t ways = CACHE_ASSOC;
    uint32_t *unshuffledArray = (uint32_t*)malloc((CACHE_SETS / SETS_PER_PAGE) * sizeof(uint32_t));
    uint32_t allSetOffset = ALL_SET_OFFSET;

    for (uint32_t i = 0; i < (CACHE_SETS / SETS_PER_PAGE); i++)
    {
        unshuffledArray[i] = i;
    }

    uint32_t *shuffledArray = shuffle(unshuffledArray, CACHE_SETS / SETS_PER_PAGE);

    uint32_t set_index, element_index, line_index;
    uint32_t currentElement, nextElement;
    for (set_index = 0; set_index < SETS_PER_PAGE; set_index++)
    {
        currentElement = (shuffledArray[0] << 10) + (set_index << (SET_INDEX_POS - 2));
        setHeads[set_index] = currentElement;

        for (line_index = 0; line_index < ways; line_index++)
        {
            for (element_index = 0; element_index < sets / SETS_PER_PAGE - 1; element_index++)
            {
                nextElement = (line_index << allSetOffset) + (shuffledArray[element_index + 1] << 10) + (set_index << (SET_INDEX_POS - 2));
                evictionArray[currentElement] = nextElement;
                currentElement = nextElement;
            }
            if (line_index == ways - 1)
            {
                nextElement = setHeads[set_index];
            }
            else
            {
                nextElement = ((line_index + 1) << allSetOffset) + (shuffledArray[0] << 10) + (set_index << (SET_INDEX_POS - 2));
            }
            evictionArray[currentElement] = nextElement;
            currentElement = nextElement;
        }
    }
    
    free(unshuffledArray);
    setHeadsCreated = true;
}

void probeAllSets()
{
    if (!setHeadsCreated)
        createSetHeads();
    for (uint32_t set = 0; set < SETS_PER_PAGE; set += SET_SKIPPING_STEP)
    {
        uint32_t pointer = setHeads[set];
        uint32_t listHead = pointer;
        do
        {
            pointer = evictionArray[pointer];
        } while (pointer != listHead);
    }
}

uint64_t measureOnce()
{
    if (!setHeadsCreated)
        createSetHeads();

    uint64_t currentTime = perfNow();

    _mm_mfence();

    probeAllSets();

    _mm_mfence();
    uint64_t result = perfNow() - currentTime;

    return result;
}

// Cleanup function
void cleanup_cache_detection() {
    if (evictionArray) {
        free(evictionArray);
        evictionArray = NULL;
    }
    if (setHeads) {
        free(setHeads);
        setHeads = NULL;
    }
    setHeadsCreated = false;
}

// Get cache size (for script use)
uint32_t get_llc_size_bytes() {
    if (!cacheDetected) {
        detect_cache_config();
    }
    return cache_config.cache_size;
}


