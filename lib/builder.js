/*
* Build sections of parameters combining real values with parsed metadata and modifiers
* Params:
*   - valuesObject: object with the real values built from the YAML.
*   - valuesMetadata: full metadata object parsed from comments including sections and values
*                     values can contain modifiers
* Returns: array of sections' lines, the first line is the section title
*/
function buildSections(valuesObject, valuesMetadata) {
  const parsedValues = valuesMetadata.filter((el) => el.section ? false : true); // Filter sections
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

  return sections;
}

module.exports = {
  buildSections,
};
