/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

const dot = require('dot-object');
const fs = require('fs');
const YAML = require('yaml');
const _ = require('lodash');

const utils = require('./utils');

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
  const extraRegex = new RegExp(`^\\s*${config.comments.format}\\s*${config.tags.extra}\\s*([^\\s]+)\\s*(\\[.*\\])?\\s*(.*)$`);
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
        name: skipMatch[1],
        skip: true,
      });
    }
    // Parse extra line
    const extraMatch = line.match(extraRegex);
    if (extraMatch && extraMatch.length > 0) {
      parsedValues.push({
        name: extraMatch[1],
        description: extraMatch[3],
        value: '', // Extra parameters will not have a value, they are used to document parameters that are not the final in the dot notation.
        extra: true,
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
 *   name: "name",      // This will be a path to the value like a.b.c
 *   value: "value"     // This will be the final value for the key path.
 *                      // If the type is not recognized it will be returned as undefined
 *                      // A modifier can be added to handle such type.
 * }
 */
function createValuesObject(valuesFilePath) {
  const resultValues = [];
  const valuesJSON = YAML.parse(fs.readFileSync(valuesFilePath, 'utf8'));

  for (let valuePath in  dot.dot(valuesJSON)) {
    let value = _.get(valuesJSON, valuePath);

    // Check if the value is a plain array, an array that only contains strings, those strings should not have metadata.
    const valuePathSplit = valuePath.split('[');
    if (valuePathSplit.length > 1) {
      // The value is inside an array
      const arrayPrefix = utils.getArrayPrefix(valuePath);
      let isPlainArray = true; // Assume it is plain until we prove the opposite
      _.get(valuesJSON, arrayPrefix).forEach((e) => {
        if (!(typeof e === "string")) {
           isPlainArray = false;
         }
      });
      if (isPlainArray) {
        value = _.get(valuesJSON, arrayPrefix);
        valuePath = arrayPrefix;
      }
    }

    if (value === null) {
      value = 'nil'; // Map the javascript 'null' to golang 'nil'
    }

    // When an element is an object it can be object or array
    // the stringify prints the empty '{}' or '[]'
    if (typeof value === "object") {
      value = JSON.stringify(value);
    }

    // The existence check is needed to avoid duplicate plain array keys
    if (!resultValues.find((v) => v.name === valuePath)) {
      resultValues.push({
        name: valuePath,
        value,
      });
    }
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
        const arrayMatch = key.match(/^(.+)\[(.+)\]$/);
        if (arrayMatch && arrayMatch.length > 0) {
          valuesAux = valuesAux[arrayMatch[1]][arrayMatch[2]];
        } else {
          valuesAux = valuesAux[key];
        }
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
