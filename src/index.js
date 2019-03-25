// Imports some libs that really work and the whole community uses
// Express
import express from "express";
const app = express();
import { graphqlExpress, graphiqlExpress } from "apollo-server-express";
// Graphql & Apollo
import {
  makeRemoteExecutableSchema,
  introspectSchema,
  mergeSchemas
} from "graphql-tools";
// import { ApolloServer } from "apollo-server";
import { HttpLink } from "apollo-link-http";
// general and varied use
import fetch from "node-fetch";
import bodyParser from "body-parser";
import cors from "cors";

// Defines the endpoint
// TODO: Must uses environment variable to load endpoints

let graphqlApis = [
  {
    uri: "https://url1.com.br/graphql",
    namespace: "url1"
  },
  {
    uri: "https://url2.com.br/graphql",
    namespace: "url2"
  },
  {
    uri: "https://url3.com.br/graphql",
    namespace: "url3"
  }
];
const createRemoteExecutableSchemas = async () => {
  // Iterate the api's and generate the links
  graphqlApis.map(api => {
    // ...then create an apollo-link and the header of api graphql
    api.link = new HttpLink({
      uri: api.uri,
      fetch
    });
    return api;
  });
  // Introspect, look !!
  for (let api in graphqlApis) {
    graphqlApis[api].schema = makeRemoteExecutableSchema({
      link: graphqlApis[api].link,
      schema: await introspectSchema(graphqlApis[api].link)
    });
  }
  return graphqlApis;
};

const generateSchema = async () => {
  // Remote Schemas
  await createRemoteExecutableSchemas();
  // Turns everything into a beautiful object with schemas
  const schemas = graphqlApis.reduce((accumulator, api) => {
    return { ...accumulator, [api.namespace]: api.schema };
  }, {});
  let apiSchemas = {};
  for (let item in schemas) {
    apiSchemas[item] = Object.assign(
      Object.create(Object.getPrototypeOf(schemas[item])),
      schemas[item]
    );
  }
  // put it together!
  let schema = mergeSchemas({
    schemas: Object.values(schemas).concat(stichingModules.schemas),
    resolvers: stichingModules.resolvers
  });
  return { schema, apiSchemas };
};

const formatResponse = (response, { context: { res } }) => {
  if (response.errors && response.errors.some(isNonCacheableError)) {
    res.set("cache-control", "no-cache, no-store, must-revalidate");
  }
  return response;
};
const graphiqlServer = graphiqlExpress(req => ({
  endpointURL: path.dirname(req.originalUrl)
}));
const createServer = async () => {
  // builds schemas and everything else
  const { schema, apiSchemas } = await generateSchema();
  // server stuff
  const port = process.env.PORT || 4000;

  app
    .use(
      "/graphql",
      bodyParser.json(),
      graphqlExpress((req, res) => ({
        schema,
        formatResponse,
        context: { req, res, apiSchemas }
      }))
    )
    .listen(port, () => {
      console.log(`Listening on http://localhost:${port}`);
    });
  // .catch(err => {
  //   if (!(err instanceof Error)) {
  //     err = new Error(err)
  //   }
  // })
};
createServer();
