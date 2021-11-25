/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

class Parameter {
  constructor(name) {
    // The parameter path using dot notation
    this.name = name;
    // The parameter value
    this.value = undefined;
     // The parameter type
    this.type = '';
     // The modifier applied to the paramer
    this.modifier = '';
     // The parameter description
    this.description = '';
     // The section the parameter belongs to
    this.section = '';
     // Skips the check and README renderization of the parameter
    this.skip = false;
     // Extra parameters won't be checked but will be rendered on the README
    this.extra = false;
     // Force a parameter to appear in the schema. All the actual parameters must go to the schema
    this.forceRenderIntoSchema = false;
  }
}

module.exports = Parameter;
