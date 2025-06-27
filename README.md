# TLED Website Scraper

This project scrapes the TLED website (https://tled.austincc.edu) and converts the content to embeddings and stores them into a Qdrant vector database for use by Riverbot.

The main file is [crawlToQdrant.ts](crawlToQdrant.ts). The file [query.ts](query.ts) is a code only implementation to test queries against the embeddings.
