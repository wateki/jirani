Errors
Learn about our error codes and how to resolve them.

When you make an API request, errors can occur due to authentication failures, invalid input, or processing issues. It's important to handle these errors properly by understanding their structure, status codes, and related messages. You can explore the details below.

Error Structure
If there’s an issue with your request, the API returns a 4XX or 5XX HTTP status code along with a structured error response. This response includes information about what went wrong.

400 Bad Request

{
    "status": "failed",
    "error": {
        "type": "REQUEST_NOT_VALID",
        "code": "10400",
        "message": "Invalid card number",
        "validation_errors": []
    }
}
The general structure of the error contains:

Parameter	Definition	Example
status	Indicates the outcome of the request.	failed
error.type	Describes the category of the error, such as validation, authentication, or processing issues.	REQUEST_NOT_VALID
error.code	A unique identifier for the error. Useful for debugging and custom error handling.	10400
error.message	A short message that explains the error.	Invalid card number
error.validation_errors	A list of specific validation errors, usually provided when there are issues with the input data.	[{ "field": "card_number", "message": "Card number is required" }]

General Error Codes
When a request fails, it returns an error code to help identify the issue and guide troubleshooting. Below is a list of common error codes, their meanings, and potential causes:

Code	Error Type	Definition	Possible cause
10400	REQUEST_NOT_VALID	The request was rejected due to invalid parameters or missing data.	Malformed request, missing parameters, or invalid JSON payload.
10401	UNAUTHORIZATION	The request requires authentication or has invalid credentials.	Missing API key, expired token, or incorrect credentials.
10403	FORBIDDEN	The client does not have permission to access the resource.	Insufficient privileges or access restrictions.
10404	RESOURCE_NOT_FOUND	The requested resource could not be found on the server.	Nonexistent endpoint, incorrect URL, or deleted resource.
10409	RESOURCE_CONFLICT	A conflict occurred due to duplicate or conflicting data.	Attempt to create an existing resource or version conflict.
10422	UNPROCESSABLE	The request was well-formed but contained invalid data.	Failed validation due to incorrect or incomplete fields.
10500	INTERNAL_SERVER_ERROR	An unexpected server error occurred while processing the request.	System failure or unhandled exceptions.