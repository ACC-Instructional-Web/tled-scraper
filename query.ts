import 'dotenv/config'

import { QdrantVectorStore } from '@langchain/qdrant'
import { OpenAIEmbeddings } from '@langchain/openai'
import { ChatOpenAI } from '@langchain/openai'
// import { ChatAnthropic } from '@langchain/anthropic'
import { Document } from '@langchain/core/documents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { Annotation, StateGraph } from '@langchain/langgraph'

// const llm = new ChatAnthropic({
//   model: 'claude-3-5-haiku-latest',
//   temperature: 0,
// })

const llm = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0,
})

const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-large',
})

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  // url: process.env.QDRANT_URL_PROD,
  url: process.env.QDRANT_URL,
  collectionName: 'tled-website',
  apiKey: process.env.QDRANT_KEY,
})

// Define prompt for question-answering
const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are an assistant designed to help faculty and staff answer questions about the Teaching and Learning Excellence Division (TLED) at Austin Community College. When answering questions, include relevant URLs from the provided context when they support your answer. Do not include helpful information for students only. Format URLs as markdown links. Use five sentences maximum and keep the answer concise.',
  ],
  ['human', 'Question: {question}\n\nContext: {context}'],
])

// Define state for application
const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
})

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
})

// Define application steps
const retrieve = async (state: typeof InputStateAnnotation.State) => {
  const retrievedDocs = await vectorStore.similaritySearch(state.question)
  return { context: retrievedDocs }
}

const generate = async (state: typeof StateAnnotation.State) => {
  const docsContent = state.context.map((doc) => doc.pageContent).join('\n')
  const messages = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  })
  const response = await llm.invoke(messages)
  return { answer: response.content }
}

// Compile application and test
const graph = new StateGraph(StateAnnotation)
  .addNode('retrieve', retrieve)
  .addNode('generate', generate)
  .addEdge('__start__', 'retrieve')
  .addEdge('retrieve', 'generate')
  .addEdge('generate', '__end__')
  .compile()

let inputs = {
  question: 'What is the service academy?',
  // question: 'Tell me about the teaching and learning centers',
  // Claude didn't output an absolute URL

  // This gave and image url for a page link [ACC Service Academy page](https://instruction.austincc.edu/tled/wp-content/uploads/sites/3/2022/05/Screen-Shot-2022-05-23-at-3.00.55-PM-300x272.png)

  // question: 'When is the Spring Faculty Onboarding?',
  //This is the correct url except it's missing tled.austincc.edu [Faculty Talent Onboarding page](https://austincc.edu/development-opportunities/getting-started/faculty-onboarding/)

  // question: 'Who do I contact',
  //
}

console.log(inputs.question)

const result = await graph.invoke(inputs)
console.log(result.answer)

// question: 'Tell me about the teaching and learning centers',
// question: 'When is the Spring Faculty Onboarding?',
// question: 'What is Acadeum?',
// question: 'What is the service adademy?',
// question: 'Who is my department chair?',
// question: 'What are some development opportunities?',

// This gives a numbered list of 5 opportunities.
// The agent keeps a chat history of the last 5 interactions, so the user can refer to the previous answer with a prompt such as "Tell me more about 3" and the agent knows to give more information about the "Distance Education Symposium", for example
