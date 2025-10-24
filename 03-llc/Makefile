GPP:= g++
CFLAGS:= -O1 -std=c++17 -D_POSIX_SOURCE -D_GNU_SOURCE -m64 -falign-functions=64 -Wno-unused-result -Wall -I ./../poc/library/glad/include -I ./../poc/library/utils
LIBS:= -lglfw -lGL -ldl -lm
UTILS:= ./../poc/library/glad/src/glad.o ./../poc/library/utils/shader.o

# Default: build both versions
all: obj bin texture texture-auto

# Original version (Intel i7-8700 hardcoded parameters)
texture: obj/texture.o $(UTILS)
	$(GPP) -o bin/$@ $^ $(LIBS)

obj/texture.o: texture.cpp pputil.c
	$(GPP) -c texture.cpp $(CFLAGS) -o obj/texture.o

# Auto-detection version (supports AMD, Intel, and other CPUs)
texture-auto: texture-auto.cpp pputil_detect.c $(UTILS)
	$(GPP) texture-auto.cpp $(CFLAGS) $(UTILS) $(LIBS) -o bin/$@

obj:
	mkdir -p $@

bin:
	mkdir -p $@

clean:
	rm -rf bin obj 

.PHONY: all clean
