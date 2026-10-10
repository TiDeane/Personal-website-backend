import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// The region comes from the AWS_REGION environment variable, which Lambda sets
const client = new DynamoDBClient({});
export const ddbDocClient = DynamoDBDocumentClient.from(client);

// Get the DynamoDB table name from environment variables
export const tableName = process.env.VISITOR_COUNTRY_TABLE;
