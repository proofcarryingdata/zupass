<p align="center">
    <h1 align="center">
        @pcd/perftest
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/tools/perftest/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/perftest">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/perftest?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/perftest">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/perftest.svg?style=flat-square" />
    </a>
</p>

| Command line tool for testing PCD package performance |
| ----------------------------------------------------- |

To run:

    yarn start timer <pcd-package> <operation> [iteration-count]

For example:

    yarn start timer all all
    yarn start timer demo prove
    yarn start timer eddsa-ticket-pcd prove
