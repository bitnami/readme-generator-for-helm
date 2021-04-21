/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

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
      valuesMetadata.slice(i + 1).forEach((param) => {
        const parameter = { ...param };
        if (!nextSectionFound && !parameter.section) {
          if (!parameter.value) {
            // Set value from real object if there are not modifiersi
            parameter.value = valuesObject[
              valuesObject.findIndex((e) => e.name.startsWith(parameter.name))
            ].value;
          }
          section.push(parameter); // Add param to section body
        } else {
          nextSectionFound = true;
        }
      });
      sections.push(section);
    }
  });

  return sections;
}

module.exports = {
  buildSections,
};
