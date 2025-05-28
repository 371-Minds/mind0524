/**
 * Safe utility functions to prevent security vulnerabilities
 */

/**
 * Safely merges objects without risking prototype pollution
 * This function creates a new object with the properties of all provided objects
 * while ensuring no prototype properties are merged
 * 
 * @param {...Object} objects - Objects to merge
 * @returns {Object} - New merged object
 */
const safeMerge = (...objects) => {
  // Create a new empty object as the base
  const result = {};
  
  // Process each object in the arguments
  for (const obj of objects) {
    // Skip null or undefined objects
    if (obj == null) continue;
    
    // Only process actual objects (not arrays, functions, etc.)
    if (typeof obj !== 'object' || Array.isArray(obj)) {
      continue;
    }
    
    // Use Object.keys to only get own enumerable properties (not from prototype)
    for (const key of Object.keys(obj)) {
      // Skip __proto__, constructor, and prototype properties
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      
      const val = obj[key];
      
      // Handle nested objects recursively
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        // If the property already exists in result and is an object, merge them
        if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = safeMerge(result[key], val);
        } else {
          // Otherwise, create a new object through recursive merge
          result[key] = safeMerge({}, val);
        }
      } else {
        // For non-objects, simply copy the value
        result[key] = val;
      }
    }
  }
  
  return result;
};

/**
 * Safely clones an object without risking prototype pollution
 * 
 * @param {Object} obj - Object to clone
 * @returns {Object} - New cloned object
 */
const safeClone = (obj) => {
  if (obj == null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => safeClone(item));
  }
  
  // Handle objects
  return safeMerge({}, obj);
};

/**
 * Safely creates an object from entries without risking prototype pollution
 * 
 * @param {Array} entries - Array of [key, value] pairs
 * @returns {Object} - New object created from entries
 */
const safeFromEntries = (entries) => {
  const result = {};
  
  for (const [key, value] of entries) {
    // Skip dangerous properties
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    
    result[key] = value;
  }
  
  return result;
};

module.exports = {
  safeMerge,
  safeClone,
  safeFromEntries
};