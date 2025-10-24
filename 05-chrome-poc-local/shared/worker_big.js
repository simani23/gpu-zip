// Web Worker for creating memory stress via BigInt computations
// This helps saturate the memory subsystem for better timing differentiation

onmessage = e => {
  // e.data: { digits: Number }
  
  let result = BigInt(0);
  let magicNumberString = "0x";
  
  // Create a large BigInt based on digit count
  for (let i = 0; i < e.data.digits; i += 1) {
    magicNumberString += "f";
  }
  
  let magicNumber = BigInt(magicNumberString);
  
  // Infinite loop doing BigInt arithmetic to stress memory
  while (true) {
    result += magicNumber * magicNumber;
    result -= magicNumber * magicNumber;
  }
}

