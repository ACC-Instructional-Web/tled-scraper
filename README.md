# TLED Website Scraper

This project scrapes the TLED website (https://tled.austincc.edu) and converts the content to embeddings and stores them into a Qdrant vector database for use by Riverbot.

The main file is [crawlToQdrant.ts](crawlToQdrant.ts). The file [query.ts](query.ts) is a code only implementation to test queries against the embeddings.

## Local Development

Follow the Qdrant Local Quickstart guide https://qdrant.tech/documentation/quickstart Once Docker is installed etc, you can use `npm run qdrant` from the scripts in package.json.

## Crawl the TLED Website

Use the local Qdrant url for the QDRANT_URL environment variable and make sure it's up and running before using `npm run crawl`.

Once the process finishes, go to 'Collections' in the Qdrant dashboard. Under 'Actions', select 'Take Snapshot'.

Use the snapshot to populate or update the live Collection in Qdrant Cloud https://cloud.qdrant.io
