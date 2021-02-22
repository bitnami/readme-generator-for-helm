const lineReader = require('line-reader');
const fs = require('fs');
const dot = require('dot-object');
const YAML = require('yaml')
const toTable = require('json-to-markdown-table');
const { CliPrettify } = require('markdown-table-prettify');
const CONFIG = require('./config.json');

/** DOCS:
* The comments structure will be "## (Key)[Modifier?] Description"
* The order in the metadata lines must be the same than the order in the YAML object
* Modifier: [array] Indicates the key is for an array to set the description as '[]'.
*           [object] Indicates the key is for an object to set the description as '[]'.
*           [commented] Indicates the object is commented by default in the values.yaml
* When the param is an empty object or array it will be consider object by default. You need to add [array] to set it as array in the README

* The only not supported case is when we add an array with actual values. Test what happens, maybe it prints the array values
*/

main();

function main() {
  const valuesFilePath = './values-test.yaml';
  const valuesObject = createValuesObject(valuesFilePath);
  const valuesMetadata = parseMetadataComments(valuesFilePath);

  // Check missing metadata or metadata provided for non existing key
  const errors = [];
  const parsedKeys = valuesMetadata.map((el) => el.name);
  const realKeys = valuesObject.map((el) => el.name);
  const missingKeys = realKeys.filter((key) => !parsedKeys.includes(key));
  const notFoundKeys = parsedKeys.filter((key) => !realKeys.includes(key));

  missingKeys.forEach((key) => {
    errors.push(`ERROR: Missing metadata for key: ${key}`);
  });
  notFoundKeys.forEach((key) => {
    errors.push(`ERROR: Metadata provided for non existing key: ${key}`);
  });

  if (errors.length > 0) {
    console.log('\n\n######\nThe following errors must be fixed before proceeding\n######\n\n');
    errors.map((error) => console.log(error));
    return 1;
  }

  valuesObject.forEach((item, i) => {
    // Apply modifiers obtained from the parsed metadata taking precedence over real values
    if(valuesMetadata[i].value) {
      valuesObject[i].value = valuesMetadata[i].value;
    }

    valuesObject[i].description = valuesMetadata[i].description;
    // Add markdown quotes
    valuesObject[i].name = `\`${valuesObject[i].name}\``;
    valuesObject[i].value = `\`${valuesObject[i].value}\``;
  });

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
 * Returns an array of arrays containing name, description and value for each parameter
 * The array is parsed from the comments metadata
 * {
 *   name: "name", // This will be the final key
 *   description: "description", // This will contain the description
 *   value: "value" // This will be undefined if the value has an actual value. '[]', or '{}' if a modifier is provided.
 * }
 */
function parseMetadataComments(valuesFilePath) {
  const data = fs.readFileSync(valuesFilePath, 'UTF-8');
  const lines = data.split(/\r?\n/);

  const parsedValues = [];
  const entryRegex = new RegExp(`^\\s*##\\s*${CONFIG.tags.param}\\s*([^\\s]+)\\s*(\\[.*\\])?\\s*(.*)$`);
  lines.forEach((line) => {
    const match = line.match(entryRegex);
    if (match && match.length > 0) {
      parsedValues.push({
        name: match[1],
        value: match[2] ? applyTypeModifiers(match[2].split('[')[1].split(']')[0]) : undefined,
        description: match[3]
      });
    }
  });
  return parsedValues;
}

// Returns the propery value for the provided modifier
function applyTypeModifiers(modifier) {
  let type;
  switch (modifier) {
    case `${CONFIG.modifiers.array}`:
      type = "[]";
      break;
    case `${CONFIG.modifiers.object}`:
      type = "{}";
      break;
    default:
      type = undefined;
  }
  return type;
}

// Returns the last key in the path
function getFinalKey(path) {
  const keys = path.split('.');
  return keys[keys.length-1];
}
