import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient, tableName } from "../dynamodb.mjs";

// Lambda cache: keep the top countries in memory for 30 seconds, to avoid scanning the table on every request
const CACHE_TTL_MS = 30 * 1000;
var cachedTopCountries = null;
var cacheExpiresAt = 0;

/**
 * Empties the in-memory cache, so the next request scans the table again
 */
export const clearCache = () => {
  cachedTopCountries = null;
  cacheExpiresAt = 0;
};

/**
 * Receives an HTTP GET request and returns the top 3 countries by visits to the website
 */
export const getTopCountriesHandler = async (event) => {
  if (event.requestContext.http.method !== 'GET') {
    const response = {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'GET' },
      body: JSON.stringify({ error: `getTopCountriesHandler only accepts GET method, you tried: ${event.requestContext.http.method}` })
    };

    return response;
  }

  var params = {
    TableName : tableName
  };

  try {
    if (!cachedTopCountries || Date.now() >= cacheExpiresAt) {
      var items = [];
      do {
        const data = await ddbDocClient.send(new ScanCommand(params));
        items = items.concat(data.Items || []);
        params.ExclusiveStartKey = data.LastEvaluatedKey;
      } while (params.ExclusiveStartKey);

      cachedTopCountries = items
        .filter(item => item.countryName !== 'Unknown') // can remove when database is more full
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 3); // Top 3
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    }

    const response =  {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Browser cache: let the browser reuse this response for 60 seconds, to avoid calling the API on every page load
        'Cache-Control': 'max-age=60'
      },
      body: JSON.stringify({ topCountries: cachedTopCountries })
    };

    return response;
  } catch (err) {
    console.error("Error", err);

    const response = {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch data' })
    };

    return response;
  }
};
