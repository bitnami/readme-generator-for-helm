const lineReader = require('line-reader');
const fs = require('fs');
const dot = require('dot-object');
const YAML = require('yaml')
const table = require('markdown-table')
const CONFIG = require('./config.json');

/** DOCS:
* The comments structure for a parameter is "## @param (FullKeyPath)[Modifier?] Description"
* The comments structure for a section is "## @section Section Title"
* Modifiers: they allow to force a value for a parameter.
* Modifiers supported: [array] Indicates the key is for an array to set the description as '[]'.
*                      [object] Indicates the key is for an object to set the description as '[]'.
* The only not supported case is when we add an array with actual values. Test what happens, maybe it prints the array values
*/

main();

function main() {
  const valuesFilePath = './values-test.yaml';
  const valuesObject = createValuesObject(valuesFilePath);
  const valuesMetadata = parseMetadataComments(valuesFilePath);

  // Check missing metadata or metadata provided for non existing key
  const errors = [];
  const parsedValues = valuesMetadata.filter((el) => el.section ? false : true); // Remove sections
  const parsedKeys = parsedValues.map((el) => el.name);
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

  // Create final values object without sections
  valuesObject.forEach((obj, i) => {
    valuesObject[i].description = parsedValues[i].description;
    if (parsedValues[i].value) {
      // Override real values with modifiers
      valuesObject[i].value = parsedValues[i].value;
    }
  });

  // Insert sections to the final values object
  const sections = [];
  valuesMetadata.forEach((obj, i) => {
    if (obj.section) {
      // valuesObject.splice(i, 0, obj);
      const section = [];
      section.push(obj); // Add section header
      let nextSectionFound = false;
      valuesObject.slice(i).forEach((param, i) => {
        if (!nextSectionFound && !param.section) {
          section.push(param); // Add section body
        } else {
          nextSectionFound = true;
        }
      });
      sections.push(section)
    }
  });

  //const newParametersSection = renderReadmeTable(sections);
  insertReadmeTable('./test-readme.md', sections);

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
function parseMetadataComments(valuesFilePath) {
  const data = fs.readFileSync(valuesFilePath, 'UTF-8');
  const lines = data.split(/\r?\n/);

  const parsedValues = [];
  const paramRegex = new RegExp(`^\\s*##\\s*${CONFIG.tags.param}\\s*([^\\s]+)\\s*(\\[.*\\])?\\s*(.*)$`);
  const sectionRegex = new RegExp(`^\\s*##\\s*${CONFIG.tags.section}\\s*(.*)$`);
  lines.forEach((line) => {
    const paramMatch = line.match(paramRegex);
    if (paramMatch && paramMatch.length > 0) {
      parsedValues.push({
        name: paramMatch[1],
        value: paramMatch[2] ? applyTypeModifiers(paramMatch[2].split('[')[1].split(']')[0]) : undefined,
        description: paramMatch[3]
      });
    }
    const sectionMatch = line.match(sectionRegex);
    if (sectionMatch && sectionMatch.length > 0) {
      parsedValues.push({
        section: sectionMatch[1],
      });
    }
  });
  return parsedValues;
}

/*
* Returns the propery value for the provided modifier
*/
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

/*
* Add table to README.md
*/
function insertReadmeTable(readmeFilePath, sections) {
  const data = fs.readFileSync(readmeFilePath, 'UTF-8');
  const lines = data.split(/\r?\n/);
  let lineNumberSigns; // Store line starting # simbols
  let paramsSectionLimits = [];
  lines.forEach((line, i) => {
    // Find parameters section start
    const match = line.match(/(##+) Parameters/); // use minimun two # signs since the single one is the README title
    if (match) {
      lineNumberSigns = match[1];
      paramsSectionLimits.push(i);
      console.log(`Found parameters section at: ${line}`)
    }
  });
  if (paramsSectionLimits.length === 1) {
    // Find parameters section end
    let nextSectionFound = false;
    lines.slice(paramsSectionLimits[0] + 1).forEach((line, i) => {
      if (!nextSectionFound && line.match(new RegExp(`^${lineNumberSigns}\s+`))) {
        console.log(`Found next section: ${line}`);
        paramsSectionLimits.push(i + paramsSectionLimits[0]);
        nextSectionFound = true;
      } else {
        if (paramsSectionLimits[0] + i + 2 === lines.length) {
          // The parameters section is the last section in the file
          paramsSectionLimits.push(i + paramsSectionLimits[0]);
          nextSectionFound = true;
          console.log(`The paremeters section is the last section with ${lineNumberSigns} in the file`);
        }
      }
    });
  }
  if (paramsSectionLimits.length != 2) {
    throw new Error("ERROR: error getting current Parameters section from README");
  }

  console.log('Inserting the new table...');
  // Build the table adding the proper number of # to the section headers
  const newParamsSection = renderReadmeTable(sections, `${lineNumberSigns}#`);
  // Delete the old parameters section
  lines.splice(paramsSectionLimits[0] + 1, paramsSectionLimits[1] - paramsSectionLimits[0]);
  // Add the new parameters section
  lines.splice(paramsSectionLimits[0] + 1, 0, ...newParamsSection.split(/\r?\n/));

  fs.writeFileSync(readmeFilePath, lines.join('\n'));

}

/*
* Returns the README's table as string
*/
function renderReadmeTable(sections, lineNumberSigns) {
  let fullTable = "";
  sections.forEach((section) => {
    fullTable += renderSection(section, lineNumberSigns);
  });
  return fullTable;
}

/*
* Returns the section rendered
*/
function renderSection(section, lineNumberSigns) {
  let sectionTable = "";
  sectionTable += "\r\n";
  sectionTable += `${lineNumberSigns} ${section[0].section}\r\n\n`; // section header
  sectionTable += createMarkdownTable(section.slice(1)); // section body parameters
  sectionTable += "\r\n\n";
  return sectionTable;
}

/*
 * Converts an array of objects of the same type to markdown table
 */
function createMarkdownTable(objArray) {
  const modifiedArray = objArray.map((e) => {return [`\`${e.name}\``, e.description, `\`${e.value}\``]});
  //return CliPrettify.prettify((toTable(modifiedArray, ['name', 'description', 'value'])));
  return table([
    ['Name', 'Description', 'Value'],
    ...modifiedArray
  ]);
}
