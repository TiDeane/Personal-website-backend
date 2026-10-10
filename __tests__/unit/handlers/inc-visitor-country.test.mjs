// Import incCountryHandler function from inc-visitor-country.mjs 
import { incCountryHandler } from '../../../src/handlers/inc-visitor-country.mjs';

import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from "aws-sdk-client-mock";

// This includes all tests for incCountryHandler() 
describe('Test incCountryHandler', function () { 
    const ddbMock = mockClient(DynamoDBDocumentClient);
 
    beforeEach(() => {
        ddbMock.reset();
      });
 
    // invokes incCountryHandler() with valid headers
    it('increments the count for the corresponding country', async () => { 
        const returnedItem = { message: 'Updated country: PT' }; 
  
        ddbMock.on(UpdateCommand).resolves({
            returnedItem
        }); 
 
        const event = { 
            requestContext: {
                http: {
                    method: 'POST'
                }
            },
            headers: {
                'cloudfront-viewer-country': 'PT',
                'cloudfront-viewer-country-name': 'Portugal'
            }
        }; 
     
        const result = await incCountryHandler(event); 
        
        const expectedResult = { 
            statusCode: 200, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(returnedItem) 
        }; 
 
        expect(result).toEqual(expectedResult); 
    });

    // invokes incCountryHandler() with missing country-code header
    it('doesn\'t update table when country-code header is missing', async () => { 
        const returnedItem = { error: 'Failed to update count, unknown country code' }; 
  
        ddbMock.on(UpdateCommand).resolves({
            returnedItem
        }); 
 
        const event = { 
            requestContext: {
                http: {
                    method: 'POST'
                }
            },
            headers: {
                'cloudfront-viewer-country-name': 'Portugal'
            }
        }; 
     
        const result = await incCountryHandler(event); 
        
        const expectedResult = { 
            statusCode: 400, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(returnedItem) 
        }; 
 
        expect(result).toEqual(expectedResult); 
        expect(ddbMock.commandCalls(UpdateCommand).length).toEqual(0); 
    });

    // invokes incCountryHandler() with a country-code header that isn't a two-letter code
    it('doesn\'t update table when country-code header is invalid', async () => { 
        const event = { 
            requestContext: {
                http: {
                    method: 'POST'
                }
            },
            headers: {
                'cloudfront-viewer-country': 'portugal',
                'cloudfront-viewer-country-name': 'Portugal'
            }
        }; 
     
        const result = await incCountryHandler(event); 
 
        expect(result.statusCode).toEqual(400); 
        expect(ddbMock.commandCalls(UpdateCommand).length).toEqual(0); 
    });

    // invokes incCountryHandler() with missing country-name header
    it('updates count but doesn\'t set countryName when country-name header is missing', async () => { 
        const returnedItem = { message: 'Updated country: PT' }; 
  
        ddbMock.on(UpdateCommand).resolves({
            returnedItem
        }); 
 
        const event = { 
            requestContext: {
                http: {
                    method: 'POST'
                }
            },
            headers: {
                'cloudfront-viewer-country': 'PT'
            }
        }; 
     
        const result = await incCountryHandler(event); 
        
        const expectedResult = { 
            statusCode: 200, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(returnedItem) 
        }; 
 
        expect(result).toEqual(expectedResult);
    });

    // invokes incCountryHandler() with a method other than POST
    it('returns 405 and doesn\'t update table when the method isn\'t POST', async () => {
        const event = {
            requestContext: {
                http: {
                    method: 'GET'
                }
            },
            headers: {
                'cloudfront-viewer-country': 'PT',
                'cloudfront-viewer-country-name': 'Portugal'
            }
        };

        const result = await incCountryHandler(event);

        expect(result.statusCode).toEqual(405);
        expect(ddbMock.commandCalls(UpdateCommand).length).toEqual(0);
    });
});
 