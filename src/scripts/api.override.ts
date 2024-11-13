import type { ComfyNodeDef, UserDataFullInfo } from "@/types/apiTypes";
import type { ComfyApi } from "./api";

const remoteStaticAssetsUrl = "http://localhost:8082/static-assets/e17e3d42-b338-41cc-8587-ba84ee3003e7"

const context = {
    api_info: {} as any
}

const getAPIInfo: () => Promise<any> = async () => {
    const api_info_promise = new Promise((resolve) => {
        try {
            const handleMessage = (event) => {
                const message = event.data;
                if (message?.internal) {
                    const internalMessage = message.internal;
                    if (typeof internalMessage.data === "object") {
                        if (internalMessage.type === "api_info") {
                            resolve(internalMessage.data);
                        }
                        window.removeEventListener("message", handleMessage);
                    }
                }
            };
            window.addEventListener("message", handleMessage);

            window.parent.postMessage({ internal: { type: "api_info" } }, "*");
        } catch (error) {
            console.error(error);
            resolve(undefined);
        }
    });

    return api_info_promise;
};

export function applyOverride(object: ComfyApi) {
    object.getUserData = (file: string, options?: RequestInit): Promise<Response> => {
        if (file.startsWith('workflows/')) {
            return Promise.resolve(new Response(JSON.stringify({ error: 'Bad Request' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            }));
        }
        return Promise.resolve(new Response(JSON.stringify({}), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        }));
    };

    // @ts-ignore
    object.listUserData = (dir: string, recurse: boolean, split?: boolean): Promise<string[] | string[][]> => {
        return Promise.resolve(recurse ? [[]] : []);
    };

    object.getExtensions = async (): Promise<string[]> => {
        return []
        const api_info = await getAPIInfo();
        context.api_info = api_info;
        console.log("api_info", api_info);

        const url = new URL(`${api_info.machine_url}/static-assets/${api_info.machine_id}/extension-list.json`);
        console.log("api_info", "extension-list", url);

        return fetch(url)
            .then(response => response.json())
            .then(data => data || [])
            .catch(error => {
                console.error('Error fetching extensions:', error);
                return [];
            });
    };

    object.getNodeDefs = async (): Promise<Record<string, ComfyNodeDef>> => {
        // return fetch(remoteStaticAssetsUrl + "/object_info.json")
        //     .then(response => response.json())
        //     .then(data => data || {})
        //     .catch(error => {
        //         console.error('Error fetching node definitions:', error);
        //         return {};
        //     });

        const api_info = await getAPIInfo();
        context.api_info = api_info;
        console.log("api_info", api_info);

        const url = new URL(`${api_info.machine_url}/static-assets/${api_info.machine_id}/object_info.json`);
        console.log("api_info", url);
        return fetch(url)
            .then(response => response.json())
            .then(data => data || {})
            .catch(error => {
                console.error('Error fetching node definitions:', error);
                return {};
            });
    };

    object.getSystemStats = (): Promise<any> => {
        return Promise.resolve(
            {
                "system": {
                    "os": "posix",
                    "comfyui_version": "v0.2.2",
                    "python_version": "3.11.9 (main, Apr  2 2024, 08:25:04) [Clang 15.0.0 (clang-1500.3.9.4)]",
                    "pytorch_version": "2.1.2",
                    "embedded_python": false,
                    "argv": [
                        "main.py"
                    ]
                },
                "devices": [
                    {
                        "name": "mps",
                        "type": "mps",
                        "index": null,
                        "vram_total": 137438953472,
                        "vram_free": 51983417344,
                        "torch_vram_total": 137438953472,
                        "torch_vram_free": 51983417344
                    }
                ]
            }
        )
    }

    object.getUserConfig = (): Promise<any> => {
        return Promise.resolve({ "storage": "server", "migrated": true })
    }

    object.getSettings = (): Promise<any> => {
        return Promise.resolve({
            "Comfy.DevMode": true,
            "Comfy.UseNewMenu": "Disabled",
            "Comfy.ColorPalette": "dark",
            "Comfy.Logging.Enabled": true,
            "Comfy.NodeSearchBoxImpl": "default",
            "mtb.imageFeed.enabled": true,
            "VHS.AdvancedPreviews": false,
            "pysssss.SnapToGrid": false,
            "Comfy.SnapToGrid.GridSize": "10",
            "mtb.Debug.enabled": false,
            "Comfy.Validation.Workflows": false,
            "Comfy.NodeLibrary.Bookmarks": [],
            "Comfy.Queue.ImageFit": "cover",
            "Comfy.Sidebar.Size": "small"
        }
        )
    }

    object.getSetting = (): Promise<any> => {
        return Promise.resolve(null)
    }

    const originalApiURL = object.apiURL;
    object.apiURL = (path: string): string => {
        return originalApiURL.call(object, path);
    }

    const originalFileURL = object.fileURL;
    object.fileURL = (path: string): string => {
        console.log("path", path);
        if (path.startsWith("/extensions")) {
            const final = `/static-assets/${context.api_info.machine_id}${path}`
            console.log("api_info", final);
            return final;
        }

        return originalFileURL.call(object, path);
    }

    object.listUserDataFullInfo = async (dir: string): Promise<UserDataFullInfo[]> => {
        return Promise.resolve([])
    }

    const originalFetchApi = object.fetchApi;
    object.fetchApi = async (path: string): Promise<Response> => {
        if (path.startsWith("/prompt")) {
            return Promise.resolve(new Response(JSON.stringify({
                exec_info: {
                    queue_remaining: 0,
                }
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            }));
        }

        return originalFetchApi.call(object, path);
    }

    object.createSocket = (isReconnect?: boolean) => {
    }

    window.addEventListener("message", handleMessage)

    return object
}

const handleMessage = (event) => {
    const message = event.data;
    if (message.internal) {
        const internalMessage = message.internal;
        switch (internalMessage.type) {
            case "update_api_info": {
                context.api_info = internalMessage.data;
                break;
            }
            default:
                console.warn(`Unknown event sent with type ${internalMessage.type}`);
        }
    }
};