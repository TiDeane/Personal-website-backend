// Import getTopCountriesHandler function from get-top-countries.mjs
import { getTopCountriesHandler } from '../../../src/handlers/get-top-countries.mjs';

import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from "aws-sdk-client-mock";

// This includes all tests for getTopCountriesHandler()
describe('Test getTopCountriesHandler', () => {
    const ddbMock = mockClient(DynamoDBDocumentClient);

    const event = {
        requestContext: {
            http: {
                method: 'GET'
            }
        }
    };

    beforeEach(() => {
        ddbMock.reset();
      });

    it('should return 3 countries', async () => {
        const items = [
            { countryCode: 'PT', countryName: 'Portugal', count: 10 },
            { countryCode: 'DE', countryName: 'Germany', count: 8 },
            { countryCode: 'BR', countryName: 'Brazil', count: 5 }
        ];

        ddbMock.on(ScanCommand).resolves({
            Items: items,
        });

        // Invoke getTopCountriesHandler()
        const result = await getTopCountriesHandler(event);

        const expectedResult = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=300'
            },
            body: JSON.stringify({ topCountries: items })
        };

        // Compare the result with the expected result
        expect(result).toEqual(expectedResult);
    });

    // the scan result is split over two pages
    it('should read every page of the scan', async () => {
        const lastKey = { countryCode: 'DE' };

        ddbMock.on(ScanCommand).resolves({
            Items: [
                { countryCode: 'BR', countryName: 'Brazil', count: 5 },
                { countryCode: 'DE', countryName: 'Germany', count: 8 }
            ],
            LastEvaluatedKey: lastKey
        });
        ddbMock.on(ScanCommand, { ExclusiveStartKey: lastKey }).resolves({
            Items: [
                { countryCode: 'PT', countryName: 'Portugal', count: 10 },
                { countryCode: 'FR', countryName: 'France', count: 1 }
            ]
        });

        const result = await getTopCountriesHandler(event);

        expect(result.statusCode).toEqual(200);
        expect(JSON.parse(result.body).topCountries.map(item => item.countryCode)).toEqual(['PT', 'DE', 'BR']);
        expect(ddbMock.commandCalls(ScanCommand).length).toEqual(2);
    });

    it('should return 500 when the scan fails', async () => {
        ddbMock.on(ScanCommand).rejects(new Error('scan failed'));

        const result = await getTopCountriesHandler(event);

        const expectedResult = {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to fetch data' })
        };

        expect(result).toEqual(expectedResult);
    });
});
