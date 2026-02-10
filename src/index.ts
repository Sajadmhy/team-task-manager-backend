import express from "express";
import cors from "cors";
import { graphql } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
import expressPlayground from "graphql-playground-middleware-express";

import { typeDefs } from "./schema/schema";
import { resolvers } from "./resolvers/index";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Build executable schema from typeDefs + resolvers
const schema = makeExecutableSchema({ typeDefs, resolvers });

// GraphQL endpoint
app.post("/graphql", async (req, res) => {
  const { query, variables, operationName } = req.body;
  const result = await graphql({
    schema,
    source: query,
    variableValues: variables,
    operationName,
  });
  res.json(result);
});

// GraphQL Playground (GET /playground)
app.get("/playground", expressPlayground({ endpoint: "/graphql" }));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/graphql`);
  console.log(`Playground at http://localhost:${PORT}/playground`);
});
