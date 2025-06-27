import 'dotenv/config'

import { RecursiveUrlLoader } from '@langchain/community/document_loaders/web/recursive_url'
import { compile } from 'html-to-text'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { OpenAIEmbeddings } from '@langchain/openai'
import { QdrantVectorStore } from '@langchain/qdrant'
import { JSDOM } from 'jsdom'

const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-large',
})

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_KEY,
  collectionName: 'tled-website',
})

const options = {
  wordwrap: 130,
  baseElements: { selectors: ['main'] },
  selectors: [
    { selector: 'a', options: { baseUrl: 'https://tled.austincc.edu' } },
    { selector: 'img', format: 'skip' },
    { selector: 'a > img', format: 'skip' },
  ],
}
const compiledConvert = compile(options)

// Create a custom extractor that captures both text and links
const extractor = (html: string) => {
  const text = compiledConvert(html)
  const dom = new JSDOM(html)
  // const links = Array.from(dom.window.document.querySelectorAll('main a'))
  //   .map((a) => ({
  //     text: a.textContent?.trim(),
  //     // If it's a relative url convert to an absolute url
  //     href: a.getAttribute('href')?.startsWith('/')
  //       ? 'https://tled.austincc.edu' + a.getAttribute('href')
  //       : a.getAttribute('href'),
  //   }))
  //   .filter((link) => link.href && !link.href.startsWith('#'))

  return {
    text,
    // links,
  }
}

const loader = new RecursiveUrlLoader('https://tled.austincc.edu/', {
  extractor,
  maxDepth: 20,
})

const docs = await loader.load()

// Convert the extracted content to the correct format
const formattedDocs = docs.map((doc) => ({
  ...doc,
  pageContent: doc.pageContent.text,
  metadata: {
    ...doc.metadata,
    links: doc.pageContent.links, // Store links in metadata directly
  },
}))

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
})
const allSplits = await splitter.splitDocuments(formattedDocs)

// Add source URL to metadata for each split
allSplits.forEach((split) => {
  split.metadata = {
    ...split.metadata,
    url: split.metadata.source,
  }
})

// Add documents in batches
const batchSize = 100
for (let i = 0; i < allSplits.length; i += batchSize) {
  const batch = allSplits.slice(i, i + batchSize)
  console.log(
    `Adding batch ${i / batchSize + 1} of ${Math.ceil(
      allSplits.length / batchSize
    )}`
  )
  await vectorStore.addDocuments(batch)
}
