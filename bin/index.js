#!/usr/bin/env node

/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

const { program } = require('commander');
const { runReadmenator } = require('../index');

program
  .requiredOption('-r, --readme <path>', 'Path to the README.md file')
  .requiredOption('-v, --values <path>', 'Path to the values.yaml file')
  .option('-c, --config <path>', 'Path to the config file');

program.parse(process.argv);

const options = program.opts();

runReadmenator(options);
