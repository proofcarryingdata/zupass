<p align="center">
    <h1 align="center">
        @pcd/artifacts
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/artifacts/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/artifacts">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/artifacts?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/artifacts">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/artifacts.svg?style=flat-square" />
    </a>
</p>

| An essential command line tool created to simplify the retrieval and storage of artifacts, primarily focusing on zero-knowledge. It is meant for use across various PCD components and packages and can also be used to run simulated zero-knowledge ceremonies for testing purposes. External developers can use it to download the artifacts to be used in PCD packages (e.g. .wasm and .zkey files). |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

Artifacts reside in an R2 Cloudflare instance and are publicly accessible using the following URL format: `https://artifacts.pcdpass.xyz/<package-name>/latest/<file-name>` (e.g. https://artifacts.pcdpass.xyz/zk-eddsa-event-ticket-pcd/latest/circuit.json). There are currently 3 files for each package: `circuit.wasm`, `circuit.zkey`, `circuit.json` (i.e. zk verification key).

## 🛠 Install

Install the `@pcd/artifacts` CLI with npm:

```bash
npm i -g @pcd/artifacts
```

or run specific commands with `npx`:

```bash
npx @pcd/artifacts download
```

## 📜 Usage

The CLI currently includes four commands and is mainly used in zk PCD packages to generate `.wasm`, `.zkey` and `.json` (verification key) files with a dummy ceremony, to upload the same files that are supposed to be used in production, and to download them.

```
Usage: pcd-artifacts [options] [command]

A command line utility designed to manage PCD artifacts.

Options:
  -v, --version                     Show PCD artifacts CLI version.
  -h, --help                        display help for command

Commands:
  download [options] [pcd-package]  Download artifacts for 1 or all PCD supported packages.
  generate [options]                Generate zero-knowledge unsafe artifacts with a dummy trusted-setup (only for testing).
  list-packages                     List supported PCD packages containing artifacts for downloading.
  upload [options] [pcd-package]    Upload artifacts of a PCD package into an R2 instance.
  help [command]                    display help for command
```

The following is an example of how `@pcd/zk-eddsa-event-ticket-pcd` uses the CLI to handle artifacts in the `package.json` scripts:

```json
{
  "scripts": {
    "artifacts:download": "pcd-artifacts download zk-eddsa-event-ticket-pcd",
    "artifacts:generate": "pcd-artifacts generate",
    "artifacts:upload": "pcd-artifacts upload zk-eddsa-event-ticket-pcd"
  }
}
```

The passport app (server and client) also downloads and place them in the `public` folder. The following is the script they use:

```json
{
  "scripts": {
    "artifacts:download": "pcd-artifacts download -o public"
  }
}
```

### Adding a new supported PCD package

If you are working on a PCD package that needs this CLI, simply add the name of the package to the list of supported packages, in the file `packages/artifacts/src/config.js`, and use the scripts as the example above.

Remember to ignore the folder containing the artifacts (i.e. `packages/<your-package>/artifacts`).

Each time you update the circuits, remember to upload the new artifacts.

### Generate zero-knowledge artifacts for testing

PCD packages using Circom circuits and needing zero-knowledge artifacts to generate and verify proofs can make a dummy ceremony with the following command: `pcd-artifacts generate`. You can also specify the ptau power and the output directory. The command is supposed to be executed from the package directory, as it automatically detects the `circuits` folder which must contain an `index.circom` file as the entry point. The files will be saved in the `./artifacts` folder by default.

If you don't have Circom installed, please see the [official documentation](https://docs.circom.io/getting-started/installation) and install a version > `2.0.0`.

```
Usage: pcd-artifacts generate [options]

Generate zero-knowledge unsafe artifacts with a dummy trusted-setup (only for testing).

Options:
  -p, --ptau-power <power>  Power of two of the maximum number of constraints that the ceremony can accept.
  -o, --output <output>     Path to the directory where the output will be written [default: artifacts].
  -h, --help                display help for command
```

### Upload artifacts on the R2 instance

Artifacts can be loaded onto the R2 instance with the command: `pcd-artifacts upload <pcd-package>`. The first time you use this command you will be asked for the access key and the secret. Please ask the PCD team if you can request them.

```
Usage: pcd-artifacts upload [options] [pcd-package]

Upload artifacts of a PCD package into an R2 instance.

Arguments:
  pcd-package                       Supported PCD package.

Options:
  -a, --artifacts <artifacts-path>  Path to the directory containing the artifacts [default: artifacts].
  -h, --help                        display help for command
```

### Download artifacts from the R2 instance

Artifacts can be downloaded from the R2 instance with the command: `pcd-artifacts download`. If you want to download the artifacts of 1 specific package you can specify it by running `pcd-artifacts download <pcd-package>`. The files will be saved in the `./artifacts` folder by default. This command can also be used by external developers.

```
Usage: pcd-artifacts download [options] [pcd-package]

Download artifacts for 1 or all PCD supported packages.

Arguments:
  pcd-package            Supported PCD package.

Options:
  -o, --output <output>  Path to the directory where the output will be written [default: artifacts].
  -h, --help             display help for command
```
