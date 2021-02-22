const lineReader = require('line-reader');
const fs = require('fs');
const dot = require('dot-object');
const YAML = require('yaml')
const toTable = require('json-to-markdown-table');
const { CliPrettify } = require('markdown-table-prettify');
const CONFIG = require('./config.json');

// DOCS:
// The comments structure will be "## (Key)[Modifier?] Description"
// The order in the metadata lines must be the same than the order in the YAML object
// Modifier: [array] Indicates the object is an empty array to set the description as '[]'.
//           [object] Same as [array] but indicates it is an object.
//           [commented] Indicates the object is commented by default in the values.yaml
// When the param is an empty object or array it will be consider object by default. You need to add [array] to set it as array in the README

// The only not supported case is when we add an array with actual values. Test what happens, maybe it prints the array values

main();

function main() {
  const valuesFilePath = './values.yaml';
  const valuesObject = createValuesObject(valuesFilePath);
  const valuesMetadata = parseMetadataComments(valuesFilePath);

  const errors = []; // Array to store list of errors

  // If the value is took from the metadata it means it is an empty object
  // and it has in the metadata object the proper '[]' or '{}'
  valuesObject.forEach((item, i) => {
    if (item.name != valuesMetadata[i].name) {
      console.log(`WARN: Checking ${item.name} against ${valuesMetadata[i].name}`);
      // Check parsed metadata from comments matches the real objects paths
      errors.push(`ERROR: Missing metadata for ${item.name}`);
    }
    if(valuesMetadata[i].value) {
      // Set the values for objects with modifiers
      valuesObject[i].value = valuesMetadata[i].value;
    }
    // Add the description from the metadata
    valuesObject[i].description = valuesMetadata[i].description;
    // Add markdown quotes to the name and value
    valuesObject[i].value = `\`${valuesObject[i].value}\``;
    valuesObject[i].name = `\`${valuesObject[i].name}\``;
  });

  if (errors.length > 0) {
    // Print all errors and exit
    console.log('\n\n######\nThe following errors must be fixed before proceeding\n######\n\n');
    errors.map((error) => console.log(error));
    return 1;
  }

  //console.log(valuesObject)
  const markdownTable = createMarkdownTable(valuesObject);
  console.log(markdownTable);
}

/*
 * Converts an array of objects of the same type to markdown table
 */
function createMarkdownTable(objArray) {
  return CliPrettify.prettify((toTable(objArray, ['name', 'description', 'value'])));
}

/* Returns an array of arrays containing name and value for all the parameters
 * in the values.yaml
 * The array is generated from the YAML keys and values directly
 * {
 *   name: "name", // This will be a path to the value like a.b.c
 *   value: "value" // This will be the final value for the key path except if it is an empty object, that will be undefined
 * }
 */
function createValuesObject(valuesFilePath) {
  const resultValues = [];
  const valuesPaths = YAML.parse(fs.readFileSync(valuesFilePath, 'utf8'));
  const doc = YAML.parseDocument(fs.readFileSync(valuesFilePath, 'utf8'));

  for (let valuePath in dot.dot(valuesPaths)) {
    let value = doc.getIn(valuePath.split('.'), false);
    if (value && typeof(value) == 'object') {
      // Set the value as undefined since it will be an empty object
      // It should have a modifier that will come from the metadata
      value = undefined;
    }
    if (value === null) {
      value = 'nil';
    }
    resultValues.push({
      name: valuePath,
      value: value
    });
  }
  return resultValues;
}

/*
 * Returns an array of arrays containing name, description and value for each parameter
 * The array is parsed from the comments metadata
 * {
 *   name: "name", // This will be the final key
 *   description: "description", // This will contain the description
 *   value: "value" // This will be undefined if the value has an actual value. '[]', or '{}' if it is an empty object.
 * }
 */
function parseMetadataComments(valuesFilePath) {
  const data = fs.readFileSync(valuesFilePath, 'UTF-8');
  const lines = data.split(/\r?\n/);

  const parsedValues = [];
  const entryRegex = new RegExp(`^\\s*##\\s*${CONFIG.tags.paramTag}\\s*([^\\s]+)(\\[.*\\])?\\s*(.*)$`);
  lines.forEach((line) => {
    const match = line.match(entryRegex);
    if (match && match.length > 0) {
      parsedValues.push({
        name: match[1],
        value: match[2] ? (match[2] === "[array]" ? "[]" : "{}") : undefined,
        description: match[3]
      });
    }
  });
  return parsedValues;
}

// Return the last key in the path
function getFinalKey(path) {
  const keys = path.split('.');
  return keys[keys.length-1];
}
