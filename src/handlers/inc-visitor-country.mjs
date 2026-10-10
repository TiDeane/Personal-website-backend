import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient, tableName } from "../dynamodb.mjs";

/**
 * Receives an HTTP POST request and increments the visitor's country on DynamoDB
 */
export const incCountryHandler = async (event) => {
  if (event.requestContext.http.method !== 'POST') {
    const response = {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'POST' },
      body: JSON.stringify({ error: `incCountryHandler only accepts POST method, you tried: ${event.requestContext.http.method}` })
    };

    return response;
  }

  // HTTP API (payload format 2.0) always lowercases header names
  const headers = event.headers || {};
  const countryCode = headers["cloudfront-viewer-country"] || 'Unknown';
  const countryName = headers["cloudfront-viewer-country-name"] || 'Unknown';

  console.log("Resolved countryCode:", countryCode);
  console.log("Resolved countryName:", countryName);

  var params = {
    TableName: tableName,
    Key: { countryCode },
    ExpressionAttributeNames: { '#c': 'count' },
    ExpressionAttributeValues: {
      ':zero': 0,
      ':inc': 1,
    },
  };

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    // Abort and don't update table if countryCode is unknown or isn't a two-letter code
    console.log("Unknown country code - aborting operation");

    const response = {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to update count, unknown country code' })
    };

    return response;
  } else if (countryName === "Unknown") {
    // Update count but don't set countryName if it is unknown
    params.UpdateExpression = 'SET #c = if_not_exists(#c, :zero) + :inc';
  } else {
    // Update both
    params.UpdateExpression = 'SET #c = if_not_exists(#c, :zero) + :inc, #n = :countryName';
    params.ExpressionAttributeNames['#n'] = 'countryName';
    params.ExpressionAttributeValues[':countryName'] = countryName;
  }

  try {
    await ddbDocClient.send(new UpdateCommand(params));

    const response = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Updated country: ${countryCode}` })
    };

    return response;
  } catch (err) {
    console.error("Error", err.stack);

    const response = {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to update count' })
    };

    return response;
  }
};
