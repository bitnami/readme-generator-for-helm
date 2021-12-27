#!/usr/bin/env node

/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

const { program } = require('commander');
const { runReadmeGenerator } = require('../index');

program
  .requiredOption('-v, --values <path>', 'Path to the values.yaml file')
  .option('-r, --readme <path>', 'Path to the README.md file')
  .option('-c, --config <path>', 'Path to the config file')
  .option('-s, --schema <path>', 'Path for the OpenAPI Schema output file');

program.parse(process.argv);

const options = program.opts();

runReadmeGenerator(options);
