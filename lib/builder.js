/*
* Build sections of parameters combining real values with parsed metadata and modifiers
* Params:
*   - valuesObject: object with the real values built from the YAML.
*   - valuesMetadata: full metadata object parsed from comments including sections and values
*                     values can contain modifiers
* Returns: array of sections' lines, the first line is the section title
*/
function buildSections(valuesObject, valuesMetadata) {
  // Insert sections to the final values object
  const sections = [];
  valuesMetadata.forEach((obj, i) => {
    if (obj.section) {
      const section = [];
      section.push(obj); // Add section header
      let nextSectionFound = false;
      valuesMetadata.slice(i+1).forEach((param) => {
        if (!nextSectionFound && !param.section) {
          if (!param.value) {
            // Set value from real object if there are not modifiers
            param.value = valuesObject[valuesObject.findIndex((e) => e.name === param.name)].value;
          }
          section.push(param); // Add param to section body
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
