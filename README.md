# JumpInChat homepage

Home page with user registration/login, room lists, user account settings and messaging. Also includes admin/site-mod functions

## Contents
1. [Installation and setup](#installation-and-setup)
1. [Development](#development)
    1. [Requirements](#requirements)
    1. [Running locally](#running-locally)

## Installation and setup

```
# install nvm and setup to use node version defined in .nvmrc
nvm install
nvm use

# install Yarn via your preferred method
yarn install --frozen-lockfile
```

## Development

### Requirements

Requires Node.js v10+

Ideally use [node version manager (nvm)](https://github.com/nvm-sh/nvm). Running `nvm install && nvm use` should set the version to one best suited for the project, based on `.nvmrc`.

Local environment variables are set in `nodemon.json`

### Dependencies

Install via yarn `yarn install --frozen-lockfile`

### Running locally

1. start [API server](https://github.com/jumpinchat/jumpinchat-web)
1. start local mongodb
1. start local server:

```bash
# run nodemon, output piped to bunyan to format logs
npx nodemon | npx bunyan
```
