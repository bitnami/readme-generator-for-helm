/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

class Parameter {
  constructor(name) {
    this.name = name;                         // The parameter path using dot notation
    this.value = undefined;                   // The parameter value
    this.type = "";                           // The parameter type
    this.modifier = "";                       // The modifier applied to the paramer
    this.description = "";                    // The parameter description
    this.section = "";                        // The section the parameter belongs to
    this.skip = false;                        // Skips the check and README renderization of the parameter
    this.extra = false;                       // Extra parameters won't be checked but will be rendered on the README
    this.forceRenderIntoSchema = false;       // Force a parameter to appear in the schema.
                                              // By default all the actual parameters must go to the schema
  }
}

module.exports = Parameter;