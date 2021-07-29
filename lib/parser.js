/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

const dot = require('dot-object');
const fs = require('fs');
const YAML = require('yaml');

/*
 * Returns the proper value for the provided modifier
 */
function applyModifiers(modifier, config) {
  let type;
  switch (modifier) {
    case `${config.modifiers.array}`:
      type = '[]';
      break;
    case `${config.modifiers.object}`:
      type = '{}';
      break;
    case `${config.modifiers.string}`:
      type = '""';
      break;
    default:
      type = undefined;
  }
  return type;
}

/*
 * Returns an array of objects containing parameters or sections
 * The array is parsed from the comments metadata
 * Parameter object structure:
 * {
 *   name: "name", // This will be the final key
 *   description: "description", // This will contain the description
 *   // Undefined if the value has an actual value. '[]', or '{}' if a modifier is provided.
 *   value: "value
 * }
 * Section object structure:
 * {
 *   section: "Section Title"
 * }
 */
function parseMetadataComments(valuesFilePath, config) {
  const data = fs.readFileSync(valuesFilePath, 'UTF-8');
  const lines = data.split(/\r?\n/);

  const parsedValues = [];
  const paramRegex = new RegExp(`^\\s*${config.comments.format}\\s*${config.tags.param}\\s*([^\\s]+)\\s*(\\[.*\\])?\\s*(.*)$`);
  const sectionRegex = new RegExp(`^\\s*${config.comments.format}\\s*${config.tags.section}\\s*(.*)$`);
  const skipRegex = new RegExp(`^\\s*${config.comments.format}\\s*${config.tags.skip}\\s*(.*)$`);
  lines.forEach((line) => {
    // Parse param line
    const paramMatch = line.match(paramRegex);
    if (paramMatch && paramMatch.length > 0) {
      parsedValues.push({
        name: paramMatch[1],
        value: paramMatch[2] ? applyModifiers(paramMatch[2].split('[')[1].split(']')[0], config) : undefined,
        modifier: !!paramMatch[2],
        description: paramMatch[3],
      });
    }
    // Parse section line
    const sectionMatch = line.match(sectionRegex);
    if (sectionMatch && sectionMatch.length > 0) {
      parsedValues.push({
        section: sectionMatch[1],
      });
    }
    // Parse skip line
    const skipMatch = line.match(skipRegex);
    if (skipMatch && skipMatch.length > 0) {
      parsedValues.push({
        skip: skipMatch[1],
      });
    }
  });
  return parsedValues;
}

/*
 * Returns an array of arrays containing name and value for all the parameters
 * in the values.yaml
 * The array is generated from the YAML keys and values directly
 * {
 *   name: "name",  // This will be a path to the value like a.b.c
 *   value: "value" // This will be the final value for the key path.
 *                  // If the type is not recognized it will be returned as undefined
 *                  // A modifier can be added to handle such type.
 * }
 */
function createValuesObject(valuesFilePath) {
  const resultValues = [];
  const valuesPaths = YAML.parse(fs.readFileSync(valuesFilePath, 'utf8'));
  const doc = YAML.parseDocument(fs.readFileSync(valuesFilePath, 'utf8'));
  /* eslint-disable no-restricted-syntax */
  /* eslint-disable guard-for-in */
  for (const valuePath in dot.dot(valuesPaths)) {
    let value = doc.getIn(valuePath.split('.'), false);
    let isPlainArray = false;
    if (valuePath.includes('[')) {
      // It is an array
      const temporalValue = doc.getIn([valuePath.split('[')[0], Number(valuePath.match(/(\d)/)[0])], false);
      try {
        value = temporalValue.get(valuePath.split(']')[1].split('.')[1]);
      } catch (e) {
        // The array is a plain array (only strings) so the elements inside do not need docs
        isPlainArray = true; // All the elements of the plain array will have this property set.
        // TODO(miguelaeh): Set the default array value instead of empty.
        value = '[]';
      }
    }
    if (value && typeof (value) === 'object') {
      switch (value.type) {
        case 'FLOW_MAP':
          value = '{}';
          break;
        case 'FLOW_SEQ':
          value = '[]';
          break;
        default:
          value = undefined; // The type is not recognized.
      }
    }
    if (value === null) {
      value = 'nil'; // Map the javascript 'null' to golang 'nil'
    }
    resultValues.push({
      name: valuePath,
      value,
      isPlainArray,
    });
  }
  return resultValues;
}

/*
 * Returns an array containing name , value, type, section and description for all the parameters
 * in the values.yaml
 * The result is generated from 'sections' object, which is an array of array,
 * while the type is obtained by parsing the YAML file.
 * If a nil value is detected, this function will throw an error.
 */
function generateMetadataObject(sections, valuesPath) {
  const values = YAML.parse(fs.readFileSync(valuesPath, 'utf8'));
  const res = [];

  sections.forEach((section) => {
    const sectionHeader = section.shift();
    section.forEach((value) => {
      const valueTree = value.name.split('.');
      let valuesAux = values;
      valueTree.forEach((key) => {
        valuesAux = valuesAux[key];
      });
      const valueAux = value;
      valueAux.section = sectionHeader.section;
      // Fix issue with 'typeof' setting Arrays as objects
      // Ref: https://stackoverflow.com/questions/12996871/why-does-typeof-array-with-objects-return-object-and-not-array
      if (Array.isArray(valuesAux)) {
        valueAux.type = 'array';
      } else {
        valueAux.type = typeof valuesAux;
      }
      delete valueAux.modifier;
      res.push(valueAux);
    });
  });

  const nilValues = [];
  res.forEach((value) => {
    if (value.value === 'nil') {
      nilValues.push(value.name);
    }
  });
  if (nilValues.length > 0) {
    throw new Error(`Invalid type 'nil' for the following values: ${nilValues.join(', ')}`);
  }

  return res;
}

module.exports = {
  parseMetadataComments,
  createValuesObject,
  generateMetadataObject,
};
