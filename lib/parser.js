const dot = require('dot-object');
const fs = require('fs');
const YAML = require('yaml');

/*
 * Returns an array of objects containing parameters or sections
 * The array is parsed from the comments metadata
 * Parameter object structure:
 * {
 *   name: "name", // This will be the final key
 *   description: "description", // This will contain the description
 *   value: "value" // This will be undefined if the value has an actual value. '[]', or '{}' if a modifier is provided.
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
  const skipRegex = new RegExp(`^\\s*${config.comments.format}\\s*${config.tags.skip}\\s*(.*)$`);;
  lines.forEach((line) => {
    // Parse param line
    const paramMatch = line.match(paramRegex);
    if (paramMatch && paramMatch.length > 0) {
      parsedValues.push({
        name: paramMatch[1],
        value: paramMatch[2] ? applyModifiers(paramMatch[2].split('[')[1].split(']')[0], config) : undefined,
        modifier: paramMatch[2] ? true : false,
        description: paramMatch[3]
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

  for (let valuePath in dot.dot(valuesPaths)) {
    let value = doc.getIn(valuePath.split('.'), false);
    if (valuePath.includes('[')) {
      // It is an array
      const temporalValue = doc.getIn([valuePath.split('[')[0], Number(valuePath.match(/(\d)/)[0])], false);
      try {
        value = temporalValue.get(valuePath.split(']')[1].split('.')[1]);
      } catch (e) {
        // The array is a plain array (only strings) and because of that the elements do not need docs
        value = undefined;
      }
    }
    if (value && typeof(value) == 'object') {
      switch (value.type) {
        case "FLOW_MAP":
          value = "{}";
          break;
        case "FLOW_SEQ":
          value = "[]";
          break
        default:
          value = undefined; // The type is not recognized. We can add a modifier to it to bypass the error
      }
    }
    if (value === null) {
      value = 'nil'; // Map the javascript 'null' to golang 'nil'
    }
    resultValues.push({
      name: valuePath,
      value: value
    });
  }
  return resultValues;
}

/*
 * Returns the propery value for the provided modifier
 */
function applyModifiers(modifier, config) {
  let type;
  switch (modifier) {
    case `${config.modifiers.array}`:
      type = "[]";
      break;
    case `${config.modifiers.object}`:
      type = "{}";
      break;
    default:
      type = undefined;
  }
  return type;
}

module.exports = {
  parseMetadataComments,
  createValuesObject,
};
