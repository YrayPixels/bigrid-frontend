# AI Nail Virtual Try-On

# Overview
The AI Nail Virtual Try On API offers an innovative way to enhance the online experience for customers interested in nail art. It allows shoppers to visualize a variety of nail styles virtually, from artificial and acrylic nails to press-on options and gel designs. With unlimited color and texture options, users can effortlessly explore different looks on both natural and synthetic nails. The platform enables personalized try-ons, letting individuals switch between styles and see before-and-after comparisons easily. This seamless integration streamlines product discovery and increases customer confidence by providing accurate, interactive previews before purchasing.

## Integration Guide
This guide walks you through:

Workflow for AI Nail Virtual Try On API:

**Authentication Required:** `Authorization: Bearer YOUR_API_KEY`

**Workflow Steps:**

1. **Image Upload Preparation:**
   - The process begins with preparing a back of the hand image.

2. **Nail Design Setup Options:**
   - Begin by selecting a suitable nail color. You can also choose a custom shape according to your taste.

3. **Initiate AI Task and Obtain Task ID:**
   - Send the uploaded image(s) along with the chosen effect configuration via an HTTP POST request to `/s2s/v2.0/file`.
   - Await a unique task ID in the response, which identifies this interaction.

4. **Poll Task Status (Continuous Check):**
   - Use the obtained `task_id` to periodically poll the task status using an HTTP GET request (e.g., `GET /task/${task_id}`).
   - Continuously monitor for:
     - `Task_status = "success"` (process completed).
     - `Task_status = "error"` (resolve or retry if applicable).
   - Update the workflow accordingly once the status transitions to success.

This structured workflow ensures efficient integration with user inputs, automated monitoring of tasks, and seamless retrieval of results.

---

* API Playground

Interactively explore and test the API using our official playground:

**API Playground:**
[http://yce.makeupar.com/api-console/en/api-playground/ai-nail-virtual-try-on/](http://yce.makeupar.com/api-console/en/api-playground/ai-nail-virtual-try-on/)

---

* Authentication
- Include your API key in the request header using **Bearer Token**:
    ```
    Authorization: Bearer YOUR_API_KEY
    ```
You can find your API Key at https://yce.makeupar.com/api-console/en/api-keys/.


* 1. Upload an Image

You may upload a file directly to the server or provide a valid image URL in the VTO task payload.

   * Upload Endpoint

```
POST /s2s/v2.0/file
```

Alternatively, skip this step if you already have a public image URL.

---

* 2. Prepare an effect template
There are four distinct setup modes available for this purpose:
  * Customizing the color and aligning it with your current nail look
  * Utilizing a preset design and a specific shape to create your vision
  * Adding pressed-on nails and linking them with your existing original nail image
  * Providing image links for pressing-on nail products that match your preferences.

   * Effect Template JSON Schemas
```
{
    "version": "1.0",
    "effect_type": "nail_polish", // valid values: ['nail_polish', 'press_on_nails']
    "effects": [],
    "ref_file_ids": []
}
```

   * Effect Format
- Nail Polish - Color
```
{
    "sub_type": "color",
    "finger": "index", // valid values: ['thumb', 'index', 'middle', 'ring', 'pinky']
    "color": "#ff0000",
    "texture": "cream", // valid values: ['matte', 'cream', 'metallic', 'jelly', 'sheer', 'pearl', 'textured', 'shimmer_coarse', 'shimmer_fine']
    "transparency": 0, // 0-100, for textures except metallic
    "reflection": 0, // 0-100
    "contrast": 0, // 0-100
    "roughness": 0, // 0-100
    "shimmer_opacity": 0, // 0-100, for texture pearl
    "shimmer_size": 0, // 0-100, for texture shimmer_coarse and shimmer_fine
    "textured_size": 0, // 0-100, for texture textured
}
```

- Nail Polish - Design
```
{
    "sub_type": "design",
    "finger": "index", // valid values: ['thumb', 'index', 'middle', 'ring', 'pinky']
    "ref_file_url": "",  // Optional; Either ref_file_id or ref_file_url must be filled, but only one can be selected.
    "ref_file_index": 0, // This field is optional unless uploading is selected. Index corresponding to ref_file_ids under the root node
    "texture": "cream", // valid values: ['matte', 'cream', 'metallic', 'jelly', 'sheer', 'pearl', 'textured', 'shimmer_coarse', 'shimmer_fine']
    "transparency": 0, // 0-100, only for textures except metallic
    "reflection": 0, // 0-100
    "contrast": 0, // 0-100
    "roughness": 0, // 0-100
    "shimmer_opacity": 0, // 0-100, for texture pearl
    "shimmer_size": 0, // 0-100, for texture shimmer_coarse and shimmer_fine
    "textured_size": 0, // 0-100, for texture textured
}

```

- Press On Nails - Color
  * You can find the latest shape values at: https://plugins-media.makeupar.com/wcm-saas/shapes/nails.json
```
{
    "sub_type": "color",
    "finger": "index", // valid values: ['thumb', 'index', 'middle', 'ring', 'pinky']
    "shape": "square_oval", // Please check the nails.json. valid values: ['square_oval','square_square','square_squoval','squoval_oval','squoval_square','squoval_squoval','oval_oval','oval_square','oval_squoval','almond_oval','almond_square','almond_squoval','stiletto_oval','stiletto_square','stiletto_squoval],
    "length": 1.0, // 0.8-2.15, for shapes except original
    "color": "#ff0000",
    "texture": "cream", // valid values for other shapes: ['matte', 'cream', 'metallic']
    "reflection": 0, // 0-100
    "contrast": 0, // 0-100
    "roughness": 0 // 0-100
}
```

- Press on Nails - Design
```
{
    "sub_type": "design",
    "finger": "index", // valid values: ['thumb', 'index', 'middle', 'ring', 'pinky']
    "ref_file_url": "",  // Optional; Either ref_file_id or ref_file_url must be filled, but only one can be selected.
    "ref_file_index": 0, // This field is optional unless uploading is selected. Index corresponding to ref_file_ids under the root node
    "texture": "cream", // valid values: ['matte', 'cream', 'metallic']
    "reflection": 0, // 0-100
    "contrast": 0, // 0-100
    "roughness": 0, // 0-100
}

```

   * Effect Template Design Logic
1. **Detect effect type** (`press_on_nails` vs `nail_polish`).
2. **Iterate over each entry in `effects`:**

   *If `sub_type === "color"`* → map fields directly, fill missing texture‑related keys with defaults.
   *If `sub_type === "design"`* →
   - If the user gave a `ref_file_url`, keep it and **omit** `ref_file_index`.
   - If the user supplied an index (`ref_file_index`), ensure `ref_file_ids` exists and the index is valid; then set `"ref_file_id": ref_file_ids[index]` (optional – some back‑ends expect the raw index, not id).

3. **Normalize numeric ranges** – clamp any out‑of‑range values to 0‑100 or length limits.
4. **Add missing optional keys** with defaults so the schema validator passes.
5. **Serialize** the final object as JSON (compact or pretty for debugging).

   * Example Payload (ready to send)
```
{
  "version": "1.0",
  "src_file_url": "https://plugins-media.makeupar.com/strapi/assets/nail_user_photo_01_27d4260646.jpg",
  "effect_type": "press_on_nails",
  "ref_file_ids": [
    "Ks3kh+1nPpVNm8iJb5374CWtBzkT4B44NPJwXbBKqVxfjK3xgCQ+hRt9MJXBFaud",
    "+Z7PSjuzigvsc3S/Yli1A4WN7c3J6NJHFqK2iUlqD2BfjK3xgCQ+hRt9MJXBFaud"
  ],
  "effects": [
    {
      "sub_type": "design",
      "finger": "thumb",
      "texture": "cream",
      "reflection": 100,
      "contrast": 50,
      "roughness": 0,
      "ref_file_index": 0
    },
    {
      "sub_type": "design",
      "finger": "index",
      "texture": "cream",
      "reflection": 100,
      "contrast": 50,
      "roughness": 0,
      "ref_file_index": 1
    },
    {
      "sub_type": "design",
      "finger": "middle",
      "texture": "cream",
      "reflection": 100,
      "contrast": 50,
      "roughness": 0,
      "ref_file_url": "https://plugins-media.makeupar.com/strapi/assets/press_on_nail_06_3_9ce2ddc47a.png"
    },
    {
      "sub_type": "design",
      "finger": "pinky",
      "texture": "cream",
      "reflection": 100,
      "contrast": 50,
      "roughness": 0,
      "ref_file_url": "https://plugins-media.makeupar.com/strapi/assets/press_on_nail_06_5_f6e46dd56f.png"
    },
    {
      "sub_type": "design",
      "finger": "ring",
      "texture": "cream",
      "reflection": 100,
      "contrast": 50,
      "roughness": 0,
      "ref_file_url": "https://plugins-media.makeupar.com/strapi/assets/press_on_nail_06_4_2103ca8cac.png"
    }
  ]
}
```


* 3. Create a Nail VTO Task and Poll for Results

Once you have an image and a complete effect payload, create a task. The API processes the request asynchronously. You must poll the task status until it reaches `success` or `error`.

   * Create Task Endpoint

```
POST /s2s/v2.0/task/nail-vto
```

   * Polling Endpoint

```
GET /s2s/v2.0/task/nail-vto/{task_id}
```

---

## File Specs & Errors

* AI Nail Virtual Try-On Specification

**Supported Nail View**
A single nail image in a clear front view without obstruction.

| Item | Supported Dimensions | Supported File Size | Supported Formats |
| --- | --- | --- | --- |
| Nail Design Image - Nail Polish | *   271 px ≤ Width ≤ 542 px<br>*   522 px ≤ Height ≤ 1044 px<br>*   At least 72ppi<br>The image will be applied from the center, and the virtual try-on effect will vary according to the length of user’s fingernails. | ≤ 1MB | png |
| Nail Design Image - Press-On Nail | *   271 px ≤ Width ≤ 542 px<br>*   522 px ≤ Height ≤ 1044 px<br>*   0.5 ≤ Image aspect ratio (H/W) ≤ 3.5<br>*   At least 72ppi<br>The image’s content, shape, and length settings are all used to generate the virtual try-on effect.<br>Since the user’s fingernail width is detected to ensure proper image scaling, it is recommended to create separate images for each fingernail with the correct aspect ratio.<br>Please download a press-on nail design image sample, and refer to the image guidelines for further details. Download: [Nail_Design_Image_Guidelines.pdf](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/You_Cam_API_AI_Nail_Virtual_Try_On_Press_on_Nail_Design_Image_Guidelines_a229b51750.pdf) | ≤ 1MB​ | png (with transparent background) |

Press-on nail design image sample:

![](https://plugins-media.makeupar.com/strapi/assets/thumbnail_press_on_nail_06_5_f6e46dd56f.png)

[<img src="https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/youcamapi_press_on_nail_design_image_sample_de6bd64f20.png" width="60"/>](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/youcamapi_press_on_nail_design_image_sample_de6bd64f20.png)

---

**Supported Hand View**

| Item | Supported Dimensions | Supported File Size | Supported Formats |
| --- | --- | --- | --- |
| User Photo | *   Long side ≤ 2048<br>*   Short side ≥ 256 | ≤ 10MB | jpg/jpeg/png |
* Support only one hand in the input image
* The area of hand palm is better to be at least half of that of input image
* The aspect ratio of the input image is better to be 1:1, 3:4, 4:3
* The nails of fingers should not be occluded
* It is better that there is no nail tip and nail polish on the nail

![](https://plugins-media.makeupar.com/strapi/assets/thumbnail_nail_user_photo_02_fdba1848d6.jpg)

---

* Error Codes

| Error Code | Description |
|  ----  | ----  |
| error_nail_too_small | The nail regions are too small. |
| error_no_nail	| No nails were detected in the source image. |


* Environment & Dependency

| Sample Code Language / Tool | Recommended Runtime Versions |
|---|---|
| cURL | - bash >= 3.2</br>   - curl >= 7.58 (modern TLS/HTTP support)</br>   - jq >= 1.6 (robust JSON parsing) |
| Node.js (JavaScript) | Node >= 18 (for global fetch) |
| JavaScript | - Chrome / Edge >= 80</br>   - Firefox >= 74</br>   - Safari >= 13.1 |
| PHP | PHP >= 7.4 (for modern TLS/compat), ext-curl (recommended) or allow_url_fopen=On + ext-openssl, ext-json |
| Python | Python >= 3.10 (for f-strings), requests >= 2.20.0 |
| Java | Java 11+ (for HttpClient), Jackson Databind >= 2.12.0 |

---

## JS Camera Kit
{% partial file="/_partials/js-camera-kit.md" /%}


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

[AI Nail Virtual Try-On](https://docs.perfectcorp.com/_bundle/reference/ai_nail_vto.yaml)

## V1.0

Generate virtual try-on experiences for nail polish and press-on nails from uploaded images using AI processing.

### Run an AI Nail Vto task.

 - [POST /s2s/v2.0/task/nail-vto](https://docs.perfectcorp.com/reference/ai_nail_vto/v1.0/paths/~1s2s~1v2.0~1task~1nail-vto/post.md): This endpoint initiates the nail virtual try-on process. You must provide source file(s) and reference image(s) (via URL or File ID), along with specific nail effect configurations. The task will be processed asynchronously, and you can check its status using the task_id returned in this response.

### Check the status of a AI Nail Vto task.

 - [GET /s2s/v2.0/task/nail-vto/{task_id}](https://docs.perfectcorp.com/reference/ai_nail_vto/v1.0/paths/~1s2s~1v2.0~1task~1nail-vto~1%7Btask_id%7D/get.md)





# AI Fitzpatrick Skin Type Analysis

# Overview

![](https://plugins-media.makeupar.com/smb/blog/post/2026-01-28/webp_a00e88ca-e20a-4082-89c2-9d486b03b8e8.webp)

**AI Fitzpatrick Skin Type Analysis**

Integrate AI driven Fitzpatrick skin type detection into your applications to classify skin types accurately using camera input. This API enables developers to build personalized skincare, sunscreen, and product recommendation workflows for eCommerce and digital health platforms.

**Skin Type Detection**

The API uses computer vision and machine learning models to analyze skin characteristics and return a Fitzpatrick classification in a single request. It provides structured, objective data that can be directly consumed by frontend applications, recommendation engines, or clinical systems.

The Fitzpatrick Scale, introduced by Dr. Thomas B. Fitzpatrick, defines six skin types based on melanin levels and response to UV exposure, allowing systems to predict tendencies to burn or tan.

**Classification Output**

The API returns one of six standardized skin types from Type I to Type VI based on UV response modeling.

This output enables developers to deliver tailored product recommendations, automate skincare workflows, and enhance personalization logic across user experiences while maintaining consistency and scalability.

| Fitzpatrick Scale | Skin Type | Skin Reaction to Sun |
|  ----  | ----  | ---- |
| Type I | White | Almost always burns, never tans |
| Type II |  Beige | Usually burns, tans minimally |
| Type III | Light Brown | Sometimes burns, gradually tans |
| Type V | Medium Brown | Rarely burns, tans easily |
| Type V | Dark Brown | Very rarely burns |
| Type VI | Very Dark Brown | Almost never burns |

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/fitapatrick_skin_type_S_02_enu_5e4343e801.jpg)

![](https://plugins-media.makeupar.com/smb/blog/post/2026-03-10/webp_b9ca4198-1a9e-44df-9551-ac3ad8b65d17.webp)

---

## Integration Guide

**1. Capture Image**
Capture a front facing image with adequate lighting. Ensure the face is clearly visible and occupies a sufficient portion of the frame.


**2. Upload Image**
Request upload URLs and file IDs via:

```
POST /s2s/v2.0/file
```

Upload the image using the returned URL.
Alternatively, provide a publicly accessible image URL hosted on your own storage.


**3. Optional Preprocessing**

```
POST /s2s/v2.0/task/fitzpatrick-scale-analyzer/pre-process
```

Use this step when the image contains multiple faces or when explicit target selection is required. For single face images, this step can be skipped if default indexing is sufficient.


**4. Retrieve Preprocess Result**

```
GET /s2s/v2.0/task/fitzpatrick-scale-analyzer/pre-process
```

Configure a [webhook](/develop/webhook.md) or implement polling to retrieve task results. With webhooks, your application receives automatic notifications when the task is completed. With polling, your system repeatedly calls the task endpoint until the status changes from running to success or error.

**5. Execute Analysis Task**

```
POST /s2s/v2.0/task/fitzpatrick-scale-analyzer
```

Submit the task using file IDs or image URLs as input. The response returns a task_id for tracking and retrieving the result.


**6. Retrieve Task Result**

```
GET /s2s/v2.0/task/fitzpatrick-scale-analyzer/{task_id}
```

Use the task ID to track status and obtain results.

[Webhooks](/develop/webhook.md) can be configured to receive asynchronous notifications on task completion with a success or error status. Polling is also supported by repeatedly calling the task endpoint until the status is updated from running to success or error.

Usage is only charged when the task completes successfully.

---

## File Specs & Errors

* Supported Formats & Dimensions

|AI Feature|Supported Dimensions|Supported File Size|Supported Formats|
|  ----  | ----  | ----  | ----  |
| AI Fitzpatrick Skin Type Analysis | The length of the longer side shall not exceed 4096 pixels, and the length of the shorter side shall be no less than 320 pixels. | < 10MB | jpg/jpeg |

* Error Codes

|Error Code|Description|
|  ----  | ----  |
| error_below_min_image_size | Source image dimensions must be at least 320 pixels. |
|error_face_position_invalid|Your face needs to be fully visible in the image, without any parts cut off|
|error_face_position_too_small|The face in your photo is too small to analyze properly|
|error_face_position_out_of_boundary|Your face is either too large or partially outside the edges of the photo|
|error_insufficient_lighting|The lighting is too dim, which makes analysis difficult|
|error_face_angle_invalid|Your face angle isn't quite right. For front-facing shots, keep your head within 10 degrees of straight. For side-facing shots, the angle should be more than 15 degrees|

* Environment & Dependency

| Sample Code Language / Tool | Recommended Runtime Versions |
|---|---|
| cURL | - bash >= 3.2</br>   - curl >= 7.58 (modern TLS/HTTP support)</br>   - jq >= 1.6 (robust JSON parsing) |
| Node.js (JavaScript) | Node >= 18 (for global fetch) |
| JavaScript | - Chrome / Edge >= 80</br>   - Firefox >= 74</br>   - Safari >= 13.1 |
| PHP | PHP >= 7.4 (for modern TLS/compat), ext-curl (recommended) or allow_url_fopen=On + ext-openssl, ext-json |
| Python | Python >= 3.10 (for f-strings), requests >= 2.20.0 |
| Java | Java 11+ (for HttpClient), Jackson Databind >= 2.12.0 |


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

[AI Fitzpatrick Skin Type Analysis](https://docs.perfectcorp.com/_bundle/reference/ai_fitzpatrick_skin_type.yaml)

## V2.0

AI Fitzpatrick Skin Type Analysis precisely categorizes skin tones into six types, from Type I: White, Type II: Beige, Type III: Light Brown, Type V: Medium Brown, Type V: Dark Brown, to Type VI: Very Dark Brown, based on melanin levels and sensitivity to UV exposure. This system predicts how likely your skin is to burn or tan. 

### Run an AI Fitzpatrick Scale Analyzer detection task.

 - [POST /s2s/v2.0/task/fitzpatrick-scale-analyzer/pre-process](https://docs.perfectcorp.com/reference/ai_fitzpatrick_skin_type/v2.0/paths/~1s2s~1v2.0~1task~1fitzpatrick-scale-analyzer~1pre-process/post.md): Use the pre-process task when the source image may contain more than one valid target, or when your integration needs to explicitly choose which detected target receives the effect. For single-target images, pre-process can be skipped when the feature supports a default index value and your application does not need manual target selection.

The pre-process task detects candidate targets in the source image and returns their coordinates in data.results.result. Each item in the result array represents one detected target. Review the returned coordinates, map them to the intended face or region in the source image, and use that item's zero-based array index as the index value when creating the effect task.

For images with multiple detected faces or regions, do not rely on the default index value without checking the pre-process result. The effect is applied only to the target selected by index, so the integration must confirm the result item that corresponds to the intended target before running the effect task.

This task is asynchronous. After creating the task, handle completion with webhook if the feature supports it, or poll the corresponding pre-process status endpoint until data.task_status is success or error.

### Check the status of a AI Fitzpatrick Scale Analyzer detection task.

 - [GET /s2s/v2.0/task/fitzpatrick-scale-analyzer/pre-process/{task_id}](https://docs.perfectcorp.com/reference/ai_fitzpatrick_skin_type/v2.0/paths/~1s2s~1v2.0~1task~1fitzpatrick-scale-analyzer~1pre-process~1%7Btask_id%7D/get.md)

### Run an AI Fitzpatrick Scale Analyzer task.

 - [POST /s2s/v2.0/task/fitzpatrick-scale-analyzer](https://docs.perfectcorp.com/reference/ai_fitzpatrick_skin_type/v2.0/paths/~1s2s~1v2.0~1task~1fitzpatrick-scale-analyzer/post.md): AI tasks are asynchronous. Prefer webhook-based completion handling when the feature supports webhooks. Configure your webhook endpoint, verify webhook signatures, and use the received task_id to query the task result after a success or error notification. See the webhook integration guide for setup and verification details.

If webhooks are not supported for the feature, or if your integration cannot use webhooks, implement polling. After starting an AI task, keep polling the task status endpoint at the given polling_interval until the task status is either success or error.

Do not stop polling a running task for longer than the allowed polling window. If the task is not polled in time, the task may expire; a later status check can return InvalidTaskId even if processing finished, and the consumed units may still be charged.

### Check the status of a AI Fitzpatrick Scale Analyzer task.

 - [GET /s2s/v2.0/task/fitzpatrick-scale-analyzer/{task_id}](https://docs.perfectcorp.com/reference/ai_fitzpatrick_skin_type/v2.0/paths/~1s2s~1v2.0~1task~1fitzpatrick-scale-analyzer~1%7Btask_id%7D/get.md)


# AI Hat Virtual Try-On

# Overview
Step into the future of fashion with our Hyper-Realistic AR Try-On for Headwear, powered by cutting-edge AI technology. This innovative solution transforms online shopping into an immersive experience, allowing customers to virtually try on headwear with unmatched precision and realism.
From instant style discovery to true-to-life visualization, our AR technology ensures every hat and headband looks and feels authentic. Helping shoppers find their perfect fit and style before they buy. Elevate engagement, boost confidence, and redefine the way customers interact with your products.

## Integration Guide
This guide walks you through:

*   **Endpoint:** `/s2s/v2.0/task/hat`
*   **Authentication:** All requests require an `Authorization: Bearer YOUR_API_KEY`
*   **Workflow:**
    1.  **Prepare a selfie image:** Uploading an image or providing a valid image URL of yourself as the virtual try-on target.
    1.  **Prepare a hat image:** Upload a hat product image or a photo of a person wearing hat.
    1.  **Select a style and a gender:** Select a preferred style and the gender you wish to visualize.
    1.  **Fire an AI task and Retrieve Task ID:** Capture the `task_id` from the response.
    1.  **Poll Status (`GET`):** Use the `task_id` to check the status of the task. Continue polling until `task_status` is `"success"` or `"error"`.

---

* Authentication
- Include your API key in the request header using **Bearer Token**:
```
Authorization: Bearer YOUR_API_KEY
```
You can find your API Key at https://yce.makeupar.com/api-console/en/api-keys/.

---

* AI Hat API Usage Guide

This guide explains how to upload images, prepare reference hat, and create virtual try-on tasks using the AI Hat API.

***

   * Step 1. Prepare a Selfie Image

You can:
*   Upload a selfie image using the File API (`/s2s/v2.0/file`), or
*   Provide a valid image URL.

     * Step 1.1 Upload a File Using the File API

Use the **File API** (`/s2s/v2.0/file`) to upload a target user image.

**Image Requirements:**

*   Upload a selfie photo.
*   Ensure the photo clearly shows the upper body.
*   Avoid backgrounds with multiple people or distracting objects.

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

***

     * Step 1.2. Retrieve File API Response

The response includes:

*   `file_id` for creating an AI task.
*   `requests.url` for uploading the actual image file.

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

***

     * Step 1.3. Upload Image to Provided URL

Use the `requests.url` from the File API response to upload the image:

```bash
curl --location --request PUT 'https://yce-us.s3-accelerate.amazonaws.com/demo/ttl30/...signature...' \
  --header 'Content-Type: image/jpg' \
  --header 'Content-Length: 547541' \
  --data-binary @'./selfie_photo_01_3dbd1b6683.jpg'
```

***

   * Step 2. Prepare a Reference Hat Image

You can:

*   Upload a hat image using the File API (`/s2s/v2.0/file`), or
*   Provide a valid image URL.

**Supported Hat Images:**

*   A hat product image.
*   A photo of a person wearing hat.

Refer to **[File Specs and Errors](#section/overview/File-Specs-and-Errors)** for detailed specifications.

***

   * Step 3. Create an AI Task

Select a preferred style and the gender you wish to visualize.
Use the **AI Task API** (`/s2s/v2.0/task/hat`) to create a virtual try-on task.

**Parameters:**

*   For the user image: `src_file_id` or `src_file_url`.
*   For the hat image: `ref_file_id`, or `ref_file_url`.

**Example Request:**

```bash
curl --request POST \
  --url https://yce-api-01.makeupar.com/s2s/v2.0/task/hat \
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

***

   * Step 4. Poll for Task Result

Use the task ID to check the status:

```bash
curl --request GET \
  --url https://yce-api-01.makeupar.com/s2s/v2.0/task/hat/SaGaqpDgKwFrVBgMpQMA3HY0LeqdT9_13W5TOD8_u_GPi6NqQ3dhlmN-6ntFwhzT \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json'
```

***

   * Step 5. Retrieve Result

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

* AI Hat Virtual Try-On Specification

   * Image Requirements

| Type   | Minimum Resolution | Notes |
| ------ | ------------------ | ----- |
| Selfie | 512 × 512 | Face visible, head-to-chest preferred |
| Hat  | 512 × 512 (product)<br>800 × 800 (worn) | Clear, unobstructed hat view |

**Supported Hat Image**

* Product Image Requirements
    * Minimum resolution: 512 × 512 pixels
    * Only one product per image
    * The product should cover more than 25% of the image height

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/026_thumb_dca334af3c.jpg)

* Worn Image Requirements
    * Minimum resolution: 800 × 800 pixels
    * Single Item Requirement: The model must wear exactly one item. Multiple items or accessories are not permitted.
    * Coverage Ratio: The worn item must occupy more than 20% of the total image height. This ensures the item is clearly visible and prominent within the frame.

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/010_thumb_51490eebeb.jpg)

**Supported Selfie View**

* Recommended image resolution: at least 512 × 512 pixels.
* Recommended face coverage: more than 15% of the image height.
* Single Subject Requirement: The image must contain exactly one human subject. No additional people or partial figures are allowed.
* Face Visibility: The subject's face must be fully visible without obstruction. Hair, accessories, or objects should not cover key facial features.
* Framing: The image must include at least a head shot, covering the area from the top of the head to the chest. A half-body shot (head to waist) is preferred for optimal analysis.

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/lashana_lynch_thumb_7a900b811e.jpg)

**Try-on Styles**

* There are five predefined styles for generating the virtual try-on output: "style_sporty_casual" "style_urban_fashion" "style_vacation_casual" "style_warm_cozy" and "style_bohemian". You can specify this style parameter when creating an AI task or allow the system to select a style at random by default.

![style_vacation_casual](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/5f42385b_6aef_44cd_b576_2ec10e31305d_824cc2019b.jpg)

---

* Supported Formats & Dimensions

| AI Feature | Supported Dimensions | Supported File Size | Supported Formats |
|  ----  | ----  | ----  | ----  |
| AI Hat Virtual Try-On | Input: long side <= 4096 <br>Output: 896 x 1152 | < 10MB | jpg/jpeg/png/heic |

* Error Codes

| Error Code | Description |
| ------------------------------ | -------------------------------------------- |
| error\_download\_image         | Failed to download source or reference image |
| error\_inference               | Inference pipeline error                     |
| error\_no\_face                | No face detected in source image             |
| error\_nsfw\_content\_detected | NSFW content detected in result              |
| exceed\_max\_filesize          | File size exceeds 10 MB                      |
| invalid\_parameter             | Invalid gender or style value                |
| unknown\_internal\_error       | Other internal errors                        |


* Environment & Dependency

| Sample Code Language / Tool | Recommended Runtime Versions |
|---|---|
| cURL | - bash >= 3.2</br>   - curl >= 7.58 (modern TLS/HTTP support)</br>   - jquery >= 1.6 (robust JSON parsing) |
| Node.js (JavaScript) | Node >= 18 (for global fetch) |
| JavaScript | - Chrome / Edge >= 80</br>   - Firefox >= 74</br>   - Safari >= 13.1 |
| PHP | PHP >= 7.4 (for modern TLS/compat), ext-curl (recommended) or allow_url_fopen=On + ext-openssl, ext-json |
| Python | Python >= 3.10 (for f-strings), requests >= 2.20.0 |
| Java | Java 11+ (for HttpClient), Jackson Databind >= 2.12.0 |

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

[AI Hat Virtual Try-On](https://docs.perfectcorp.com/_bundle/reference/ai_hat.yaml)

## V1.0

Generate virtual try-on experiences for hats from uploaded images using AI processing, supporting gender-specific style parameters.

### Run an AI Hat task.

 - [POST /s2s/v2.0/task/hat](https://docs.perfectcorp.com/reference/ai_hat/v1.0/paths/~1s2s~1v2.0~1task~1hat/post.md): This endpoint initiates the hat virtual try-on process. You must provide a source file, reference files (URL or ID), specify gender and style parameters. The task will be processed asynchronously, and you can check its status using the task_id returned in this response.

### Check the status of a AI Hat task.

 - [GET /s2s/v2.0/task/hat/{task_id}](https://docs.perfectcorp.com/reference/ai_hat/v1.0/paths/~1s2s~1v2.0~1task~1hat~1%7Btask_id%7D/get.md)


# AI Shoes Virtual Try-On

# Overview
Step into the future of shopping with our AR Shoes Virtual Try-On. Instantly see how your favourite styles look and fit right from your screen. Powered by cutting-edge AI technology, this experience delivers a perfect visual fit, helping you shop with confidence and reduce returns.
Explore endless styles and colours from the comfort of home. Our high-fidelity AR simulation brings every detail to life so you can enjoy the thrill of an in-store experience anytime, anywhere. Try it today and find the perfect pair that matches your style.

## Integration Guide
This guide walks you through:

*   **Endpoint:** `/s2s/v2.0/task/shoes`
*   **Authentication:** All requests require an `Authorization: Bearer YOUR_API_KEY`
*   **Workflow:**
    1.  **Prepare a selfie image:** Uploading an image or providing a valid image URL of yourself as the virtual try-on target.
    1.  **Prepare a shoes image:** Upload a shoe product image or a photo of a person wearing shoes.
    1.  **Select a style and a gender:** Select a preferred style and the gender you wish to visualize.
    1.  **Fire an AI task and Retrieve Task ID:** Capture the `task_id` from the response.
    1.  **Poll Status (`GET`):** Use the `task_id` to check the status of the task. Continue polling until `task_status` is `"success"` or `"error"`.

---

* Authentication
- Include your API key in the request header using **Bearer Token**:
```
Authorization: Bearer YOUR_API_KEY
```
You can find your API Key at https://yce.makeupar.com/api-console/en/api-keys/.

---

* AI Shoes API Usage Guide

This guide explains how to upload images, prepare reference shoes, and create virtual try-on tasks using the AI Shoes API.

***

   * Step 1. Prepare a Selfie Image

You can:
*   Upload a selfie image using the File API (`/s2s/v2.0/file`), or
*   Provide a valid image URL.

     * Step 1.1 Upload a File Using the File API

Use the **File API** (`/s2s/v2.0/file`) to upload a target user image.

**Image Requirements:**

*   Upload a selfie photo.
*   Ensure the photo clearly shows the upper body.
*   Avoid backgrounds with multiple people or distracting objects.

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

***

     * Step 1.2. Retrieve File API Response

The response includes:

*   `file_id` for creating an AI task.
*   `requests.url` for uploading the actual image file.

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

***

     * Step 1.3. Upload Image to Provided URL

Use the `requests.url` from the File API response to upload the image:

```bash
curl --location --request PUT 'https://yce-us.s3-accelerate.amazonaws.com/demo/ttl30/...signature...' \
  --header 'Content-Type: image/jpg' \
  --header 'Content-Length: 547541' \
  --data-binary @'./selfie_photo_01_3dbd1b6683.jpg'
```

***

   * Step 2. Prepare a Reference Shoes Image

You can:

*   Upload a shoe image using the File API (`/s2s/v2.0/file`), or
*   Provide a valid image URL.

**Supported Shoes Images:**

*   A shoe product image.
*   A photo of a person wearing shoes.

Refer to **[File Specs and Errors](#section/overview/File-Specs-and-Errors)** for detailed specifications.

***

   * Step 3. Create an AI Task

Select a preferred style and the gender you wish to visualize.
Use the **AI Task API** (`/s2s/v2.0/task/shoes`) to create a virtual try-on task.

**Parameters:**

*   For the user image: `src_file_id` or `src_file_url`.
*   For the shoes image: `ref_file_id`, or `ref_file_url`.

**Example Request:**

```bash
curl --request POST \
  --url https://yce-api-01.makeupar.com/s2s/v2.0/task/shoes \
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

***

   * Step 4. Poll for Task Result

Use the task ID to check the status:

```bash
curl --request GET \
  --url https://yce-api-01.makeupar.com/s2s/v2.0/task/shoes/SaGaqpDgKwFrVBgMpQMA3HY0LeqdT9_13W5TOD8_u_GPi6NqQ3dhlmN-6ntFwhzT \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json'
```

***

   * Step 5. Retrieve Result

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

* AI Shoes Virtual Try-On Specification

   * Image Requirements

| Type   | Minimum Resolution | Notes |
| ------ | ------------------ | ----- |
| Selfie | 512 × 512 | Face visible, head-to-chest preferred |
| Shoes  | 512 × 512 (product)<br>800 × 800 (worn) | Clear, unobstructed shoes view |

**Supported Shoes Image**

* Product Image Requirements
    * Minimum resolution: 512 × 512 pixels
    * Only one product per image
    * The product should cover more than 25% of the image height

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/0019_thumb_06a4a9cc5f.jpg)

* Worn Image Requirements
    * Minimum resolution: 800 × 800 pixels
    * Single Item Requirement: The model must wear exactly one item. Multiple items or accessories are not permitted.
    * Coverage Ratio: The worn item must occupy more than 20% of the total image height. This ensures the item is clearly visible and prominent within the frame.

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/0006_thumb_50a0a0640c.jpg)

**Supported Selfie View**

* Recommended image resolution: at least 512 × 512 pixels.
* Recommended face coverage: more than 15% of the image height.
* Single Subject Requirement: The image must contain exactly one human subject. No additional people or partial figures are allowed.
* Face Visibility: The subject's face must be fully visible without obstruction. Hair, accessories, or objects should not cover key facial features.
* Framing: The image must include at least a head shot, covering the area from the top of the head to the chest. A half-body shot (head to waist) is preferred for optimal analysis.

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/lashana_lynch_thumb_7a900b811e.jpg)

**Try-on Styles**

* There are five predefined styles for generating the virtual try-on output: "style_minimalist" "style_bohemian" "style_cottagecore" "style_french_elegance" and "style_retro_fashion". You can specify this style parameter when creating an AI task or allow the system to select a style at random by default.

![style_bohemian](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/cc55fe0d_aec9_4ead_b2e9_bc70f48c58b9_670a875b29.jpg)

---

* Supported Formats & Dimensions

| AI Feature | Supported Dimensions | Supported File Size | Supported Formats |
|  ----  | ----  | ----  | ----  |
| AI Shoes Virtual Try-On | Input: long side <= 4096 <br>Output: 1008 x 1344 | < 10MB | jpg/jpeg/png/heic |

* Error Codes

| Error Code | Description |
| ------------------------------ | -------------------------------------------- |
| error\_download\_image         | Failed to download source or reference image |
| error\_inference               | Inference pipeline error                     |
| error\_no\_face                | No face detected in source image             |
| error\_nsfw\_content\_detected | NSFW content detected in result              |
| exceed\_max\_filesize          | File size exceeds 10 MB                      |
| invalid\_parameter             | Invalid gender or style value                |
| unknown\_internal\_error       | Other internal errors                        |


* Environment & Dependency

| Sample Code Language / Tool | Recommended Runtime Versions |
|---|---|
| cURL | - bash >= 3.2</br>   - curl >= 7.58 (modern TLS/HTTP support)</br>   - jquery >= 1.6 (robust JSON parsing) |
| Node.js (JavaScript) | Node >= 18 (for global fetch) |
| JavaScript | - Chrome / Edge >= 80</br>   - Firefox >= 74</br>   - Safari >= 13.1 |
| PHP | PHP >= 7.4 (for modern TLS/compat), ext-curl (recommended) or allow_url_fopen=On + ext-openssl, ext-json |
| Python | Python >= 3.10 (for f-strings), requests >= 2.20.0 |
| Java | Java 11+ (for HttpClient), Jackson Databind >= 2.12.0 |

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

[AI Shoes Virtual Try-On](https://docs.perfectcorp.com/_bundle/reference/ai_shoes.yaml)

## V2.0

Generate virtual try-on experiences for shoes from uploaded images using AI processing, supporting gender-specific style parameters.

### Run an AI Shoes task.

 - [POST /s2s/v2.0/task/shoes](https://docs.perfectcorp.com/reference/ai_shoes/v2.0/paths/~1s2s~1v2.0~1task~1shoes/post.md): This endpoint initiates the shoes virtual try-on process. You must provide a source file, reference files (URL or ID), specify gender and style parameters. The task will be processed asynchronously, and you can check its status using the task_id returned in this response.

### Check the status of a AI Shoes task.

 - [GET /s2s/v2.0/task/shoes/{task_id}](https://docs.perfectcorp.com/reference/ai_shoes/v2.0/paths/~1s2s~1v2.0~1task~1shoes~1%7Btask_id%7D/get.md)



# AI Fabric Virtual Try-On

# Overview
Transform your look with stunning realism! Explore unique fabric styles with photo mode — whether it's the elegance of silky textures or the vibrance of bold prints, the AI Fabric API brings materials to life! Developers can craft immersive experiences that let users see and feel fabrics like never before. Plus, fresh fabric updates are always on the way!

---

## Integration Guide

* AI Fabric API Usage Guide

This guide explains how to upload images, fetch predefined fabric styles, and create virtual try-on tasks using the AI Fabric API.

***

   * Step 1. Upload a File Using the File API

Use the **File API** (`/s2s/v2.0/file`) to upload a target user image.

**Image Requirements:**

*   Upload a high-resolution full-body photo.
*   Ensure the photo clearly shows the entire body.
*   Avoid backgrounds with multiple people or distracting objects.

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
        "file_name": "full_body_photo_01_3dbd1b6683.jpg",
        "file_size": 547541
      }
    ]
  }'
```

***

   * Step 2. Retrieve File API Response

The response includes:

*   `file_id` for creating an AI task.
*   `requests.url` for uploading the actual image file.

**Sample Response:**

```json
{
  "status": 200,
  "data": {
    "files": [
      {
        "content_type": "image/jpg",
        "file_name": "full_body_photo_01_3dbd1b6683.jpg",
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

***

   * Step 3. Upload Image to Provided URL

Use the `requests.url` from the File API response to upload the image:

```bash
curl --location --request PUT 'https://yce-us.s3-accelerate.amazonaws.com/demo/ttl30/...signature...' \
  --header 'Content-Type: image/jpg' \
  --header 'Content-Length: 547541' \
  --data-binary @'./full_body_photo_01_3dbd1b6683.jpg'
```

***

   * Step 4. Fetch Predefined Fabric Templates

Use the **Template API** (`/s2s/v2.0/task/template/fabric`) to retrieve a list of predefined fabric templates:

```bash
curl --request GET \
    --url 'https://yce-api-01.makeupar.com/s2s/v2.0/task/template/fabric?page_size=20&starting_token=73a3c9e69b89' \
    --header 'Authorization: Bearer YOUR_API_KEY'
```

***

   * Step 5. Create an AI Task

Use the **AI Task API** (`/s2s/v2.0/task/fabric`) to create a virtual try-on task.

**Parameters:**

*   For the user image: `src_file_id` or `src_file_url`.
*   For the fabric style: `template_id`.

**Example Request:**

```bash
curl --request POST \
    --url https://yce-api-01.makeupar.com/s2s/v2.0/task/fabric \
    --header 'Authorization: Bearer YOUR_API_KEY' \
    --header 'content-type: application/json' \
    --data '{
    "template_id":"good_template_001",
    "src_file_url":"https://example.com/selfie.jpg"
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

***

   * Step 6. Poll for Task Result

Use the task ID to check the status:

```bash
curl --request GET \
  --url https://yce-api-01.makeupar.com/s2s/v2.0/task/fabric/<YOUR_TASK_ID> \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json'
```

***

   * Step 7. Retrieve Result

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


Use cases:
![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/AI%20Fabric.png)

![](https://plugins-media.makeupar.com/smb/blog/post/2024-05-07/b103976d-1b0e-4bed-aab4-9307308b84d7.jpg)

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/03%20ai%20clothes%20changer.jpg)

Suggestions for How to Shoot:
![Suggestions for How to Shoot](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/AI-Cloth-Guideline.png "Suggestions for How to Shoot")

---

## File Specs & Errors
* Supported Formats & Dimensions

|AI Feature|Supported Dimensions|Supported File Size|Supported Formats|
|  ----  | ----  | ----  | ----  |
|AI Fabric|long side <= 4096, single person only, The abdomen, face, and shoulders should all be visible. The face must not be obstructed. The body should be upright and facing forward, without any unusual poses like sitting or squatting.|< 10MB|jpg/jpeg|

* Error Codes

|Error Code|Description|
|  ----  | ----  |
|error_apply_region_not_detected|The clothing area is either too small or wasn’t detected in the input image

* Environment & Dependency

| Sample Code Language / Tool | Recommended Runtime Versions |
|---|---|
| cURL | - bash >= 3.2</br>   - curl >= 7.58 (modern TLS/HTTP support)</br>   - jq >= 1.6 (robust JSON parsing) |
| Node.js (JavaScript) | Node >= 18 (for global fetch) |
| JavaScript | - Chrome / Edge >= 80</br>   - Firefox >= 74</br>   - Safari >= 13.1 |
| PHP | PHP >= 7.4 (for modern TLS/compat), ext-curl (recommended) or allow_url_fopen=On + ext-openssl, ext-json |
| Python | Python >= 3.10 (for f-strings), requests >= 2.20.0 |
| Java | Java 11+ (for HttpClient), Jackson Databind >= 2.12.0 |

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

[AI Fabric Virtual Try-On](https://docs.perfectcorp.com/_bundle/reference/ai_fabric.yaml)

## V1.0

AI Fabric API allows you to apply fabric styles to images using predefined templates and source images.

### List predefined templates.

 - [GET /s2s/v2.0/task/template/fabric](https://docs.perfectcorp.com/reference/ai_fabric/v1.0/paths/~1s2s~1v2.0~1task~1template~1fabric/get.md)

### Run an Fabric task.

 - [POST /s2s/v2.0/task/fabric](https://docs.perfectcorp.com/reference/ai_fabric/v1.0/paths/~1s2s~1v2.0~1task~1fabric/post.md): Please refer to the polling guide for checking task status.

### Check the status of the Fabric task.

 - [GET /s2s/v2.0/task/fabric/{task_id}](https://docs.perfectcorp.com/reference/ai_fabric/v1.0/paths/~1s2s~1v2.0~1task~1fabric~1%7Btask_id%7D/get.md)


# AI Watch Virtual Try On

# Overview
Virtually Try-On AR Watches with Ease! Only One 2D Image Needed.

With just a single 2D image upload, users can instantly try on top-notch watches virtually using our innovative AR-Watches App. This unique feature sets us apart in the world of e-commerce, making it easier than ever for customers to experience your products.

## Integration Guide
This guide walks you through:

*   **Endpoint:** `/s2s/v2.0/task/2d-vto/watch`
*   **Authentication:** All requests require an `Authorization: Bearer YOUR_API_KEY`
*   **Workflow:**
    1.  **Prepare a wrist image:** Uploading an image or provide a valid image URL of your wrist
    1.  **Prepare a watch image:** Uploading an image or provide a valid image URL of a watch product
    1.  **Fire an AI task and Retrieve Task ID:** Capture the `task_id` from the response.
    1.  **Poll Status (`GET`):** Use the `task_id` to check the status of the task. Continue polling until `task_status` is `"success"` or `"error"`.

---

* API Playground

Interactively explore and test the API using our official playground:

**API Playground:**
[http://yce.makeupar.com/api-console/en/api-playground/ai-watch-virtual-try-on/](http://yce.makeupar.com/api-console/en/api-playground/ai-watch-virtual-try-on/)

---

* Authentication
- Include your API key in the request header using **Bearer Token**:
    ```
    Authorization: Bearer YOUR_API_KEY
    ```
You can find your API Key at https://yce.makeupar.com/api-console/en/api-keys/.


* 1. Upload an Image

You may upload a file directly to the server or provide a valid image URL in the VTO task payload.

   * Upload Endpoint

```
POST /s2s/v2.0/file
```

Alternatively, skip this step if you already have a public image URL.

You may upload a file directly to the URL provided in the response from the File API and then use the corresponding `src_file_id` returned by the File API to invoke the AI task later. Or provide a valid image URL in the VTO task payload as `src_file_url`. The `src_file_id` or `src_file_url` will serve as the virtual try-on target.

You must also provide another watch product image as a reference using `ref_file_ids` or `ref_file_urls` to be applied to your `src_file_id` or `src_file_url`.

The AI engine supports automatic background removal for your watch product image. However, you may provide an occlusion mask image file for either your hand (`srcmsk_file_id` or `srcmsk_file_url`) or the watch product (`refmsk_file_ids` or `refmsk_file_urls`) to fine-tune the segmentation.

---

* 2. Create a Watch VTO Task and Poll for Results

Once you have an image and a template ID, create a task. The API processes the request asynchronously. You must poll the task status until it reaches `success` or `error`.

   * Create Task Endpoint

```
POST /s2s/v2.0/task/2d-vto/watch
```

   * Polling Endpoint

```
GET /s2s/v2.0/task/2d-vto/watch/{task_id}
```

---

## File Specs & Errors

* AI Watch Virtual Try-On Specification

**Supported Watch View**
A watch image in a clear front view with the watch face unobstructed. The strap should be cropped to resemble a realistic wearing length.

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/watch_product_01_aab8053028_50ab7fe9a5.jpg)

**Supported Wrist View**
The back of the wrist should be fully visible with all five fingers clearly shown and without any occlusion.

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/watch_and_bracelet_user_01_09f16603cb_878dc89179.jpg)

**watch\_wearing\_location: float (−0.3 to 1.0)**
Indicates the position along the wrist:
−0.3 represents near the main wrist joint
1.0 represents far from the main wrist joint
Default value: null (use engine default)

![watch_wearing_location](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/bracelet_wearing_location_01ac0a048e.jpg)

**watch\_shadow\_intensity: float (0.0 to 1.0)**
Controls the strength of the shadow:
0.0 represents no shadow
1.0 represents maximum shadow
Default value: 0.15

**watch\_ambient\_light\_intensity: float (0.0 to 1.0)**
Defines the extent to which lighting references the target hand image:
0.0 ignores the hand image lighting
1.0 fully matches the hand image lighting and shadow rendering
Default value: 1.0

**Watch Anchor Points: array of 4 points in pixel coordinate (optional)**
The first two points mark the beginning and end of the strap when worn.
The remaining two points mark the upper and lower edges of the watch case.

![watch_anchor_point](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/Product_anchors_ece6851c88.jpg)

---

* Supported Formats & Dimensions

|AI Feature|Supported Dimensions|Supported File Size|Supported Formats|
|  ----  | ----  | ----  | ----  |
|AI Watch Virtual Try-On|long side <= 4096 |< 10MB|jpg/jpeg/png|

* Error Codes

|Error Code|Description|
|  ----  | ----  |
| RUNTIME_ERROR | An unexpected error occurred duwatch runtime |
| PHOTO_DETECTION_FAIL | The user photo could not be processed correctly, for example no hand detected |
| OBJECT_DETECTION_FAIL | The object photo could not be processed correctly, for example no product detected |
| PHOTO_CHECK_INVALID | The pose or size of the user photo is invalid |
| INPUT_ERROR | The input file format is incorrect |
| INPUT_MAIN_IMAGE_EMPTY | A user image is required |


* Environment & Dependency

| Sample Code Language / Tool | Recommended Runtime Versions |
|---|---|
| cURL | - bash >= 3.2</br>   - curl >= 7.58 (modern TLS/HTTP support)</br>   - jq >= 1.6 (robust JSON parsing) |
| Node.js (JavaScript) | Node >= 18 (for global fetch) |
| JavaScript | - Chrome / Edge >= 80</br>   - Firefox >= 74</br>   - Safari >= 13.1 |
| PHP | PHP >= 7.4 (for modern TLS/compat), ext-curl (recommended) or allow_url_fopen=On + ext-openssl, ext-json |
| Python | Python >= 3.10 (for f-strings), requests >= 2.20.0 |
| Java | Java 11+ (for HttpClient), Jackson Databind >= 2.12.0 |

---

## JS Camera Kit
{% partial file="/_partials/js-camera-kit.md" /%}


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

[AI Watch Virtual Try On](https://docs.perfectcorp.com/_bundle/reference/ai_watch.yaml)

## V2.0

Generate virtual try-on experiences for watches from uploaded images using AI processing, supporting alignment and shadow parameters.

### Run an AI 2D Virtual Try On Watch task.

 - [POST /s2s/v2.0/task/2d-vto/watch](https://docs.perfectcorp.com/reference/ai_watch/v2.0/paths/~1s2s~1v2.0~1task~12d-vto~1watch/post.md): This endpoint initiates the watch virtual try-on process. You must provide source file(s) and reference image(s) (via URL or File ID), along with specific parameters for alignment, shadowing, and wearing location. The task will be processed asynchronously, and you can check its status using the task_id returned in this response.

### Check the status of a AI 2D Virtual Try On Watch task.

 - [GET /s2s/v2.0/task/2d-vto/watch/{task_id}](https://docs.perfectcorp.com/reference/ai_watch/v2.0/paths/~1s2s~1v2.0~1task~12d-vto~1watch~1%7Btask_id%7D/get.md)


# AI Necklace Virtual Try On

# Overview
Luxurious Look and Feel with State-of-the-Art Virtual Try-On for Necklace
Precise AI neck and clavicle tracking gives users an ultra-realistic AR try-on experience, recreating the luxurious look and feel of physical necklace sampling.

Create realistic and dynamic necklace vitual try-on from a 2D image, no expensive 3D modelling required. Our advanced algorithms create lifelike virtual try-on necklace SKUs with sophisticated lighting effects and physically accurate motions.

## Integration Guide
This guide walks you through:

*   **Endpoint:** `/s2s/v2.0/task/2d-vto/necklace`
*   **Authentication:** All requests require an `Authorization: Bearer YOUR_API_KEY`
*   **Workflow:**
    1.  **Prepare a selfie image:** Uploading an image or provide a valid image URL
    2.  **Prepare a necklace image:** Uploading an image or provide a valid image URL of a necklace product
    3.  **Fire an AI task and Retrieve Task ID:** Capture the `task_id` from the response.
    4.  **Poll Status (`GET`):** Use the `task_id` to check the status of the task. Continue polling until `task_status` is `"success"` or `"error"`.

---

* API Playground

Interactively explore and test the API using our official playground:

**API Playground:**
[http://yce.makeupar.com/api-console/en/api-playground/ai-necklace-virtual-try-on/](http://yce.makeupar.com/api-console/en/api-playground/ai-necklace-virtual-try-on/)

---

* Authentication
- Include your API key in the request header using **Bearer Token**:
    ```
    Authorization: Bearer YOUR_API_KEY
    ```
You can find your API Key at https://yce.makeupar.com/api-console/en/api-keys/.


* 1. Upload an Image

You may upload a file directly to the server or provide a valid image URL in the VTO task payload.

   * Upload Endpoint

```
POST /s2s/v2.0/file
```

Alternatively, skip this step if you already have a public image URL.

You may upload a file directly to the URL provided in the response from the File API and then use the corresponding `src_file_id` returned by the File API to invoke the AI task later. Or provide a valid image URL in the VTO task payload as `src_file_url`. The `src_file_id` or `src_file_url` will serve as the virtual try-on target.

You must also provide another necklace product image as a reference using `ref_file_ids` or `ref_file_urls` to be applied to your `src_file_id` or `src_file_url`.

The AI engine supports automatic background removal for your selfie. However, you may provide an occlusion mask image file for your neck (`srcmsk_file_id` or `srcmsk_file_url`) to fine-tune the segmentation.

---

* 2. Create a Necklace VTO Task and Poll for Results

Once you have an image and a template ID, create a task. The API processes the request asynchronously. You must poll the task status until it reaches `success` or `error`.

   * Create Task Endpoint

```
POST /s2s/v2.0/task/2d-vto/necklace
```

   * Polling Endpoint

```
GET /s2s/v2.0/task/2d-vto/necklace/{task_id}
```

---

## File Specs & Errors

* AI Necklace Virtual Try-On Specification

**Supported Necklace View**
A front-facing image of the necklace worn, with the background removed.

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/necklace_product_01_124206cfbe_3993a2128d.jpg)

**Supported Selfie View**
A front-facing selfie with the neck clearly visible and unobstructed. Horizontal head rotation is supported within 20 degrees. The head size should be proportionate, and the neck width should occupy at least 15 per cent of the image width.

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/Necklace_restriction_83410fb6c1.png)

**necklace\_wearing\_location: array of two points (optional)**
Specifies the target locations in the photo where the necklace should be placed.
Default: null (engine default)

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/wearing_location_874264bb70.jpg)

**necklace\_shadow\_intensity: float (0.0 to 1.0)**
Controls the shadow strength:
0.0 represents no shadow
1.0 represents maximum shadow
Default value: 0.15

**necklace\_ambient\_light\_intensity: float (0.0 to 1.0)**
Defines how much the lighting references the selfie image:
0.0 ignores the selfie image lighting
1.0 fully matches the selfie image lighting and shadow rendering
Default value: 1.0

**necklace\_anchor\_point: array of two points in pixel coordinate (optional)**
Specifies the anchor points for the left and right visible ends of the necklace chain in the product image, used for alignment.
Default: null (engine default)

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/anchor_point_7f9b254ca4.jpg)

---

* Supported Formats & Dimensions

|AI Feature|Supported Dimensions|Supported File Size|Supported Formats|
|  ----  | ----  | ----  | ----  |
|AI Necklace Virtual Try-On|long side <= 4096 |< 10MB|jpg/jpeg/png|

* Error Codes

|Error Code|Description|
|  ----  | ----  |
| RUNTIME_ERROR | An unexpected error occurred dunecklace runtime |
| PHOTO_DETECTION_FAIL | The user photo could not be processed correctly, for example no neck detected |
| OBJECT_DETECTION_FAIL | The object photo could not be processed correctly, for example no product detected |
| PHOTO_CHECK_INVALID | The pose or size of the user photo is invalid |
| INPUT_ERROR | The input file format is incorrect |
| INPUT_MAIN_IMAGE_EMPTY | A user image is required |


* Environment & Dependency

| Sample Code Language / Tool | Recommended Runtime Versions |
|---|---|
| cURL | - bash >= 3.2</br>   - curl >= 7.58 (modern TLS/HTTP support)</br>   - jq >= 1.6 (robust JSON parsing) |
| Node.js (JavaScript) | Node >= 18 (for global fetch) |
| JavaScript | - Chrome / Edge >= 80</br>   - Firefox >= 74</br>   - Safari >= 13.1 |
| PHP | PHP >= 7.4 (for modern TLS/compat), ext-curl (recommended) or allow_url_fopen=On + ext-openssl, ext-json |
| Python | Python >= 3.10 (for f-strings), requests >= 2.20.0 |
| Java | Java 11+ (for HttpClient), Jackson Databind >= 2.12.0 |

---

## JS Camera Kit
{% partial file="/_partials/js-camera-kit.md" /%}


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

[AI Necklace Virtual Try On](https://docs.perfectcorp.com/_bundle/reference/ai_necklace.yaml)

## V1.0

Generate virtual try-on experiences for necklaces from uploaded images using AI processing, supporting alignment and shadow parameters.

### Run an AI 2D Virtual Try On Necklace task.

 - [POST /s2s/v2.0/task/2d-vto/necklace](https://docs.perfectcorp.com/reference/ai_necklace/v1.0/paths/~1s2s~1v2.0~1task~12d-vto~1necklace/post.md): This endpoint initiates the necklace virtual try-on process. You must provide source file(s) and reference image(s) (via URL or File ID), along with specific parameters for alignment, shadowing, and wearing location. The task will be processed asynchronously, and you can check its status using the task_id returned in this response.

### Check the status of a AI 2D Virtual Try On Necklace task.

 - [GET /s2s/v2.0/task/2d-vto/necklace/{task_id}](https://docs.perfectcorp.com/reference/ai_necklace/v1.0/paths/~1s2s~1v2.0~1task~12d-vto~1necklace~1%7Btask_id%7D/get.md)


# AI Video Generator

# Overview
YouCam AI Video Generator transforms text prompts and images into captivating videos with ease. Powered by advanced AI technology, it creates realistic motion effects that bring your ideas and photos to life. With a wide selection of professionally optimized templates, you can quickly turn still images into engaging, high quality video content.

To create an AI video from an image, start with a photo that features a clean background and a clearly visible portrait. Simply upload your image and let YouCam AI Video Generator do the rest, transforming your text prompts and photo into a dynamic video in just moments.

Use cases:

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/webp_Animate%20Photo_047_d9e1cff579.jpg)

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/AI_Dance_Video_61cf4c58d1.png)

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/241216_AI_Kiss_image05_c3b7f1ac5b.jpg)


## File Specs & Errors

* Supported Formats & Dimensions

|AI Feature|Supported Dimensions|Supported File Size|Supported Formats|
|  ----  | ----  | ----  | ----  |
| V1.0 Image to Video (Standard) |Input: >= 300*300px with aspect ratio between 1:2.5 ~ 2.5:1. Output: Up to 720p 30fps|Input: <10MB. Output: 5 seconds or 10 seconds|jpg/jpeg/png|
| V1.0 Image to Video (Professional) |Input: >= 300*300px with aspect ratio between 1:2.5 ~ 2.5:1. Output: Up to 1080p 30fps|Input: <10MB. Output: 5 seconds or 10 seconds|jpg/jpeg/png|
| V2.0 Image to Video | Input images must have a long side no greater than 4096 pixels and an aspect ratio between 1:2.5 and 2.5:1. <br> Supported output resolutions are 480p, 720p, and 1080p. If the input image’s short side exceeds the selected resolution, or if its long side is smaller than the target, the image will be automatically resized so that the short side matches the chosen resolution. |Input: <10MB. Output: 5 seconds or 10 seconds|jpg/jpeg/png|

* Error Codes

| Error Category | Scenario / Description | Suggested Action |
| -------------- | ---------------------- | ---------------- |
| Invalid request parameters | Request parameters are invalid or missing | Verify that all request parameters are correct |
| | Invalid parameter values (e.g., incorrect key or illegal value) | Check the error message field in the response and update the request parameters |
| | Invalid request method | Review the API documentation and use the correct HTTP method |
| | Requested resource does not exist (e.g., model not found) | Refer to the response error message field and correct the request parameters|
| Trigger strategy | Platform policy has been triggered | Check whether any platform policies were violated |
| | Content security policy triggered  | Review and modify the input content, then resend the request |
| | Request rate too high (rate limit exceeded)| Reduce request frequency, retry later, or contact customer service to increase limits |
| | Concurrency or QPS exceeds quota   | Reduce request frequency, or retry later |
| Internal error  | Internal server error | Retry later or contact customer service |
| | Server temporarily unavailable | Retry later or contact customer service |
| | Internal timeout due to request backlog| Retry later or contact customer service |


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

[AI Video Generator](https://docs.perfectcorp.com/_bundle/reference/ai_video_generator.yaml)

## V2.0

Bring your photos to life with AI Image to Video Generation. Upload an image and provide a description, and the system instantly converts it into motion filled visuals powered by advanced AI technology. It is the easiest way to enjoy high quality image to video generation without learning any editing tools.

### Run an AI Image to Video Generator V2 task.

 - [POST /s2s/v2.0/task/image-to-video/youcam](https://docs.perfectcorp.com/reference/ai_video_generator/v2.0/paths/~1s2s~1v2.0~1task~1image-to-video~1youcam/post.md): AI tasks are asynchronous. Prefer webhook-based completion handling when the feature supports webhooks. Configure your webhook endpoint, verify webhook signatures, and use the received task_id to query the task result after a success or error notification. See the webhook integration guide for setup and verification details.

If webhooks are not supported for the feature, or if your integration cannot use webhooks, implement polling. After starting an AI task, keep polling the task status endpoint at the given polling_interval until the task status is either success or error.

Do not stop polling a running task for longer than the allowed polling window. If the task is not polled in time, the task may expire; a later status check can return InvalidTaskId even if processing finished, and the consumed units may still be charged.

### Check the status of a AI Image to Video Generator V2 task.

 - [GET /s2s/v2.0/task/image-to-video/youcam/{task_id}](https://docs.perfectcorp.com/reference/ai_video_generator/v2.0/paths/~1s2s~1v2.0~1task~1image-to-video~1youcam~1%7Btask_id%7D/get.md)

### Run an AI Text To Video task.

 - [POST /s2s/v2.0/task/text-to-video/youcam](https://docs.perfectcorp.com/reference/ai_video_generator/v2.0/paths/~1s2s~1v2.0~1task~1text-to-video~1youcam/post.md): AI tasks are asynchronous. Prefer webhook-based completion handling when the feature supports webhooks. Configure your webhook endpoint, verify webhook signatures, and use the received task_id to query the task result after a success or error notification. See the webhook integration guide for setup and verification details.

If webhooks are not supported for the feature, or if your integration cannot use webhooks, implement polling. After starting an AI task, keep polling the task status endpoint at the given polling_interval until the task status is either success or error.

Do not stop polling a running task for longer than the allowed polling window. If the task is not polled in time, the task may expire; a later status check can return InvalidTaskId even if processing finished, and the consumed units may still be charged.

### Check the status of a AI Text To Video task.

 - [GET /s2s/v2.0/task/text-to-video/youcam/{task_id}](https://docs.perfectcorp.com/reference/ai_video_generator/v2.0/paths/~1s2s~1v2.0~1task~1text-to-video~1youcam~1%7Btask_id%7D/get.md)

## V1.0

With AI Image to Video Generation, you can upload a single photo and watch it come alive with motion and personality. Advanced artificial intelligence transforms your image into dynamic visuals, allowing you to create stunning videos without any video editing experience. Enjoy the best in AI powered image to video creation.

### List predefined templates.

 - [GET /s2s/v2.0/task/template/image-to-video](https://docs.perfectcorp.com/reference/ai_video_generator/v1.0/paths/~1s2s~1v2.0~1task~1template~1image-to-video/get.md)

### Run an Image to Video task.

 - [POST /s2s/v2.0/task/image-to-video](https://docs.perfectcorp.com/reference/ai_video_generator/v1.0/paths/~1s2s~1v2.0~1task~1image-to-video/post.md): This endpoint initiates the image to video conversion process. You must provide a template ID and source file (via URL or File ID). The task will be processed asynchronously, and you can check its status using the task_id returned in this response.

### Check the status of the Image to Video task.

 - [GET /s2s/v2.0/task/image-to-video/{task_id}](https://docs.perfectcorp.com/reference/ai_video_generator/v1.0/paths/~1s2s~1v2.0~1task~1image-to-video~1%7Btask_id%7D/get.md)
