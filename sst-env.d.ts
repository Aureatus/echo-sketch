/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
/* deno-fmt-ignore-file */

declare module "sst" {
  export interface Resource {
    "DatabaseMigrator": {
      "name": string
      "type": "sst.aws.Function"
    }
    "GeminiAPIKey": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "HonoContainer": {
      "service": string
      "type": "sst.aws.Service"
      "url": string
    }
    "MyPostgres": {
      "clusterArn": string
      "database": string
      "host": string
      "password": string
      "port": number
      "reader": string
      "secretArn": string
      "type": "sst.aws.Aurora"
      "username": string
    }
    "MyVpc": {
      "type": "sst.aws.Vpc"
    }
    "Web": {
      "type": "sst.aws.StaticSite"
      "url": string
    }
  }
}
/// <reference path="sst-env.d.ts" />

import "sst"
export {}