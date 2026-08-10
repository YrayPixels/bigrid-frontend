# AI Bag Virtual Try-On

# Overview

AR makes luxury bag shopping a tangible experience! AR tech empowers brands to showcase handbags with unmatched realism. From strap length to bag pairing, customers can visualize products instantly through camera.

## Integration Guide

This guide walks you through:

- **Endpoint:** `/s2s/v2.0/task/bag`
- **Authentication:** All requests require an `Authorization: Bearer YOUR_API_KEY`
- **Workflow:**
  1.  **Prepare a selfie image:** Uploading an image or providing a valid image URL of yourself as the virtual try-on target.
  1.  **Prepare a bag image:** Uploading an image or providing a valid image URL of a bag product or a person carrying a bag without any obstruction.
  1.  **Select a style and a gender:** Select a preferred style and the gender you wish to visualize.
  1.  **Fire an AI task and Retrieve Task ID:** Capture the `task_id` from the response.
  1.  **Poll Status (`GET`):** Use the `task_id` to check the status of the task. Continue polling until `task_status` is `"success"` or `"error"`.

---

- Authentication

* Include your API key in the request header using **Bearer Token**:

```
Authorization: Bearer YOUR_API_KEY
```

You can find your API Key at https://yce.makeupar.com/api-console/en/api-keys/.

---

- AI Bag API Usage Guide

This guide explains how to upload images, prepare reference bags, and create virtual try-on tasks using the AI Bag API.

---

- Step 1. Upload a File Using the File API

Use the **File API** (`/s2s/v2.0/file`) to upload a target user image.

**Image Requirements:**

- Upload a selfie photo.
- Ensure the photo clearly shows the upper body.
- Avoid backgrounds with multiple people or distracting objects.

**Example Request:**

```bash
curl --request POST \
  --url https://yce-api-01.makeupar.com/s2s/v2.0/file \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --data '{
    "files": [
      {
        "content_type": "image/jpg",
        "file_name": "selfie_photo_01_3dbd1b6683.jpg",
        "file_size": 547541
      }
    ]
  }'
```

---

- Step 2. Retrieve File API Response

The response includes:

- `file_id` for creating an AI task.
- `requests.url` for uploading the actual image file.

**Sample Response:**

```json
{
  "status": 200,
  "data": {
    "files": [
      {
        "content_type": "image/jpg",
        "file_name": "selfie_photo_01_3dbd1b6683.jpg",
        "file_id": "SaGaqpDgKwFrVBgMpQMA3HY0LeqdT9/13W5TOD8/u/FfjK3xgCQ+hRt9MJXBFaud",
        "requests": [
          {
            "method": "PUT",
            "url": "https://yce-us.s3-accelerate.amazonaws.com/demo/ttl30/...signature...",
            "headers": {
              "Content-Length": "547541",
              "Content-Type": "image/jpg"
            }
          }
        ]
      }
    ]
  }
}
```

---

- Step 3. Upload Image to Provided URL

Use the `requests.url` from the File API response to upload the image:

```bash
curl --location --request PUT 'https://yce-us.s3-accelerate.amazonaws.com/demo/ttl30/...signature...' \
  --header 'Content-Type: image/jpg' \
  --header 'Content-Length: 547541' \
  --data-binary @'./selfie_photo_01_3dbd1b6683.jpg'
```

---

- Step 4. Prepare a Reference Bag Image

You can:

- Upload a bag image using the File API (`/s2s/v2.0/file`), or
- Provide a valid image URL.

**Supported Bag Images:**

- Product image of the bag.
- A person carrying a bag without any obstruction as a bag reference.

Refer to **[File Specs and Errors](#section/overview/File-Specs-and-Errors)** for detailed specifications.

---

- Step 5. Create an AI Task

Select a preferred style and the gender you wish to visualize.
Use the **AI Task API** (`/s2s/v2.0/task/bag`) to create a virtual try-on task.

**Parameters:**

- For the user image: `src_file_id` or `src_file_url`.
- For the bag image: `ref_file_id`, or `ref_file_url`.

**Example Request:**

```bash
curl --request POST \
  --url https://yce-api-01.makeupar.com/s2s/v2.0/task/bag \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --data '{
    "src_file_url": "https://example.com/selfie.jpg",
    "ref_file_url": "https://example.com/accessory.jpg",
    "gender": "female",
    "style": "random"
}'
```

**Sample Response:**

```json
{
  "status": 200,
  "data": {
    "task_id": "SaGaqpDgKwFrVBgMpQMA3HY0LeqdT9_13W5TOD8_u_GPi6NqQ3dhlmN-6ntFwhzT"
  }
}
```

---

- Step 6. Poll for Task Result

Use the task ID to check the status:

```bash
curl --request GET \
  --url https://yce-api-01.makeupar.com/s2s/v2.0/task/bag/SaGaqpDgKwFrVBgMpQMA3HY0LeqdT9_13W5TOD8_u_GPi6NqQ3dhlmN-6ntFwhzT \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json'
```

---

- Step 7. Retrieve Result

A successful response includes a download URL for the result image:

```json
{
  "status": 200,
  "data": {
    "error": null,
    "results": {
      "url": "https://yce-us.s3-accelerate.amazonaws.com/demo/ttl30/...signature..."
    },
    "task_status": "success"
  }
}
```

Invalid API Key error response:

```json
{
  "status": 401,
  "error": "Unauthorized",
  "error_code": "InvalidAccessToken"
}
```

---

## File Specs & Errors

- AI Bag Virtual Try-On Specification

**Supported Bag Image**

- Product Image Requirements
  - Minimum resolution: 512 × 512 pixels
  - Only one product per image
  - The product should cover more than 25 per cent of the image height

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/040_thumb_c5f4d2af8e.jpg)

- Worn Image Requirements
  - Minimum resolution: 800 × 800 pixels

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/003_thumb_c73b207cae.jpg)

**Supported Selfie View**

- Recommended image resolution: at least 512 × 512 pixels.
- Recommended face coverage: more than 15 per cent of the image height.
- The image must clearly show a single human subject with the face fully visible and at least a head shot included in the frame, from head to chest. A half-body shot is preferred.

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/lashana_lynch_thumb_7a900b811e.jpg)

**Try-on Styles**

- There are four predefined styles for generating the virtual try-on output: "style_parisian_chic", "style_urban_chic", "style_mediterranean_chic" and "style_art_deco_style". You can specify this style parameter when creating an AI task or allow the system to randomly select a style by default.

![style_parisian_chic](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/fca6a904_b13a_4c90_bc52_d9200a473c70_4d994afa3e.jpg)

---

- Supported Formats & Dimensions

| AI Feature            | Supported Dimensions                             | Supported File Size | Supported Formats |
| --------------------- | ------------------------------------------------ | ------------------- | ----------------- |
| AI Bag Virtual Try-On | Input: long side <= 4096 <br>Output: 1104 x 1472 | < 10MB              | jpg/jpeg/png/heic |

- Error Codes

| Error Code                  | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| error_download_image        | Download srcKeys/refKeys error                             |
| error_inference             | Inference pipeline error                                   |
| error_no_face               | No face detected in source image                           |
| error_nsfw_content_detected | NSFW content detected in result image                      |
| exceed_max_filesize         | Input file size exceeds the maximum limit (10 MB)          |
| invalid_parameter           | Invalid gender option value <br>Invalid style option value |
| unknown_internal_error      | Others                                                     |

- Environment & Dependency

| Sample Code Language / Tool | Recommended Runtime Versions                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| cURL                        | - bash >= 3.2</br> - curl >= 7.58 (modern TLS/HTTP support)</br> - jq >= 1.6 (robust JSON parsing)       |
| Node.js (JavaScript)        | Node >= 18 (for global fetch)                                                                            |
| JavaScript                  | - Chrome / Edge >= 80</br> - Firefox >= 74</br> - Safari >= 13.1                                         |
| PHP                         | PHP >= 7.4 (for modern TLS/compat), ext-curl (recommended) or allow_url_fopen=On + ext-openssl, ext-json |
| Python                      | Python >= 3.10 (for f-strings), requests >= 2.20.0                                                       |
| Java                        | Java 11+ (for HttpClient), Jackson Databind >= 2.12.0                                                    |

---

License: Privacy policy

## Servers

```
https://yce-api-01.makeupar.com
```

## Security

### BearerAuthenticationV2

Use the standard 'Bearer authentication'. Put your 'API Key' in header: `Authorization:Bearer YOUR_API_KEY`. Notice that there is ' ' a space between 'Bearer' and the 'YOUR_API_KEY'.

Type: http
Scheme: bearer

## Download OpenAPI description

[AI Bag Virtual Try-On](https://docs.perfectcorp.com/_bundle/reference/ai_bag.yaml)

## V2.0

### Run an AI Bag task.

- [POST /s2s/v2.0/task/bag](https://docs.perfectcorp.com/reference/ai_bag/v2.0/paths/~1s2s~1v2.0~1task~1bag/post.md): This endpoint initiates the bag virtual try-on process. You must provide a source file, reference files (URL or ID), and specify gender and style parameters. The task will be processed asynchronously, and you can check its status using the task_id returned in this response.

### Check the status of a AI Bag task.

- [GET /s2s/v2.0/task/bag/{task_id}](https://docs.perfectcorp.com/reference/ai_bag/v2.0/paths/~1s2s~1v2.0~1task~1bag~1%7Btask_id%7D/get.md)
