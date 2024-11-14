// @ts-nocheck

import type { ComfyNodeDef, UserDataFullInfo } from '@/types/apiTypes'
import type { ComfyApi } from './api'
import { LiteGraph } from '@comfyorg/litegraph'
import { folders_files } from './cd/folder_x_file'

export function basename(path) {
  return path.split('/').pop()
}

export function getRelativePath(from, to) {
  const fromParts = from.split('/').filter(Boolean)
  const toParts = to.split('/').filter(Boolean)

  let i = 0
  while (
    i < fromParts.length &&
    i < toParts.length &&
    fromParts[i] === toParts[i]
  ) {
    i++
  }

  const relParts = [
    ...Array(fromParts.length - i).fill('..'),
    ...toParts.slice(i)
  ]
  return relParts.join('/')
}

// const remoteStaticAssetsUrl = "http://localhost:8082/static-assets/e17e3d42-b338-41cc-8587-ba84ee3003e7"

const context = {
  api_info: {} as any,
  models: [] as any,
  inputs: [] as any,
  volume_content: { content: [] } as any,
  folders_files: folders_files,
  public_folders_files: {},
  private_folders_files: {}
}

const getAPIInfo: () => Promise<any> = async () => {
  const api_info_promise = new Promise((resolve) => {
    try {
      const handleMessage = (event: MessageEvent) => {
        const message = event.data
        if (message?.internal) {
          const internalMessage = message.internal
          if (typeof internalMessage.data === 'object') {
            if (internalMessage.type === 'api_info') {
              resolve(internalMessage.data)
            }
            window.removeEventListener('message', handleMessage)
          }
        }
      }
      window.addEventListener('message', handleMessage)

      window.parent.postMessage({ internal: { type: 'api_info' } }, '*')
    } catch (error) {
      console.error(error)
      resolve(undefined)
    }
  })

  return api_info_promise
}

export function applyOverride(object: ComfyApi) {
  object.getUserData = (
    file: string,
    options?: RequestInit
  ): Promise<Response> => {
    if (file.startsWith('workflows/')) {
      return Promise.resolve(
        new Response(JSON.stringify({ error: 'Bad Request' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
    }
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    )
  }

  // @ts-ignore
  object.listUserData = (
    dir: string,
    recurse: boolean,
    split?: boolean
  ): Promise<string[] | string[][]> => {
    return Promise.resolve(recurse ? [[]] : [])
  }

  object.getExtensions = async (): Promise<string[]> => {
    return []
    const api_info = await getAPIInfo()
    context.api_info = api_info
    console.log('api_info', api_info)

    const url = new URL(
      `${api_info.machine_url}/static-assets/${api_info.machine_id}/extension-list.json`
    )
    console.log('api_info', 'extension-list', url)

    return fetch(url)
      .then((response) => response.json())
      .then((data) => data || [])
      .catch((error) => {
        console.error('Error fetching extensions:', error)
        return []
      })
  }

  object.getNodeDefs = async (): Promise<Record<string, ComfyNodeDef>> => {
    // return fetch(remoteStaticAssetsUrl + "/object_info.json")
    //     .then(response => response.json())
    //     .then(data => data || {})
    //     .catch(error => {
    //         console.error('Error fetching node definitions:', error);
    //         return {};
    //     });

    const api_info = await getAPIInfo()
    context.api_info = api_info
    console.log('api_info', api_info)

    const url = new URL(
      `${api_info.machine_url}/static-assets/${api_info.machine_id}/object_info.json`
    )
    console.log('api_info', url)
    return fetch(url)
      .then((response) => response.json())
      .then((data) => data || {})
      .catch((error) => {
        console.error('Error fetching node definitions:', error)
        return {}
      })
  }

  object.getSystemStats = (): Promise<any> => {
    return Promise.resolve({
      system: {
        os: 'posix',
        comfyui_version: 'v0.2.2',
        python_version:
          '3.11.9 (main, Apr  2 2024, 08:25:04) [Clang 15.0.0 (clang-1500.3.9.4)]',
        pytorch_version: '2.1.2',
        embedded_python: false,
        argv: ['main.py']
      },
      devices: [
        {
          name: 'mps',
          type: 'mps',
          index: null,
          vram_total: 137438953472,
          vram_free: 51983417344,
          torch_vram_total: 137438953472,
          torch_vram_free: 51983417344
        }
      ]
    })
  }

  object.getUserConfig = (): Promise<any> => {
    return Promise.resolve({ storage: 'server', migrated: true })
  }

  object.getSettings = (): Promise<any> => {
    return Promise.resolve({
      'Comfy.DevMode': true,
      'Comfy.UseNewMenu': 'Disabled',
      'Comfy.ColorPalette': 'dark',
      'Comfy.Logging.Enabled': true,
      'Comfy.NodeSearchBoxImpl': 'default',
      'mtb.imageFeed.enabled': true,
      'VHS.AdvancedPreviews': false,
      'pysssss.SnapToGrid': false,
      'Comfy.SnapToGrid.GridSize': '10',
      'mtb.Debug.enabled': false,
      'Comfy.Validation.Workflows': false,
      'Comfy.NodeLibrary.Bookmarks': [],
      'Comfy.Queue.ImageFit': 'cover',
      'Comfy.Sidebar.Size': 'small'
    })
  }

  object.getSetting = (): Promise<any> => {
    return Promise.resolve(null)
  }

  const originalApiURL = object.apiURL
  object.apiURL = (path: string): string => {
    if (path.startsWith('/view')) {
      const params = new URLSearchParams(path.split('?')[1])
      if (params.get('file_url')) {
        return params.get('file_url')
      }
      if (params.get('filename')) {
        let fileName = params.get('filename')
        if (params.get('subfolder')) {
          fileName = params.get('subfolder') + '/' + fileName
        }

        // const volume_name =  "volume_name=" + "models_user_2ZA6vuKD3IJXju16oJVQGLBcWwg"
        // const newPath = `https://comfy-deploy-dev--0d086833-28eb--comfyui-api.modal.run/view?${path.split("?")[1]}&${volume_name}`
        // return newPath;

        // if (apiHostMappings[window.location.origin]) {
        //   return `${apiHostMappings[window.location.origin]}/v1/workflows/${this.workflow_id}/assets/resolve?file_path=${encodeURIComponent(fileName)}`;
        // }
        // await this.getAPIInfo()
        const volume_name = `volume_name=${context.api_info.volume_name}` //"models_user_2ZA6vuKD3IJXju16oJVQGLBcWwg"
        let newPath = `${context.api_info.url}/view?${path.split('?')[1]}&${volume_name}`
        newPath = `${newPath}&gpu=${context.api_info.gpu}`
        newPath = `${newPath}&timeout=${context.api_info.timeout}`
        newPath = `${newPath}&user_id=${context.api_info.user_id}`
        if (context.api_info.org_id) {
          newPath = `${newPath}&org_id=${context.api_info.org_id}`
        }
        const from_volume =
          context.api_info.gpuEventId == null ||
          context.api_info.gpuEventId == undefined
        console.log('from_volume =', from_volume)
        newPath = `${newPath}&from_volume=${from_volume}`
        return newPath
      }
    }
    if (path.startsWith('/extensions')) {
      // const base = "https://static-comfy-fe-bennykok-comfy-deploy.vercel.app"
      const final = `/static-assets/${context.api_info.machine_id}${path}`
      // console.log("hi", final);
      return final
    }

    return originalApiURL.call(object, path)
  }

  const originalFileURL = object.fileURL
  object.fileURL = (path: string): string => {
    console.log('path', path)
    if (path.startsWith('/extensions')) {
      const final = `/static-assets/${context.api_info.machine_id}${path}`
      console.log('api_info', final)
      return final
    }

    return originalFileURL.call(object, path)
  }

  object.listUserDataFullInfo = async (
    dir: string
  ): Promise<UserDataFullInfo[]> => {
    return Promise.resolve([])
  }

  function createResponse(data, error?) {
    return {
      status: error ? 500 : 200,
      json: () => Promise.resolve(data)
    }
  }

  function postMessageToParent(type, data) {
    window.parent.postMessage({ internal: { type, data } }, '*')
  }

  function uploadFile(file, subdir) {
    return new Promise((resolve) => {
      try {
        const handleMessage = (event: MessageEvent) => {
          const message = event.data
          // console.log('message', event.data);
          if (message && message.internal) {
            const internalMessage = message.internal
            if (
              typeof internalMessage.data === 'object' &&
              internalMessage.data.name === file.name
            ) {
              if (internalMessage.type === 'upload_done') {
                resolve(createResponse({ name: file.name, subfolder: subdir }))
              } else if (internalMessage.type === 'upload_rejected') {
                resolve(createResponse(null, true))
              }
              window.removeEventListener('message', handleMessage)
            }
          }
        }
        window.addEventListener('message', handleMessage)
        if (subdir) {
          postMessageToParent('upload', { file, subdir })
        } else {
          postMessageToParent('upload', { file })
        }
      } catch (error) {
        console.error(error)
        resolve(createResponse(null, true))
      }
    })
  }

  const originalFetchApi = object.fetchApi
  object.fetchApi = async (path: string, options?: any): Promise<Response> => {
    if (path.startsWith('/prompt')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            exec_info: {
              queue_remaining: 0
            }
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      )
    }

    if (path === '/upload/image' || path === '/upload/mask') {
      const imageName = options.body.get('image')?.name
      if (/\.DS_Store|__MACOSX/.test(imageName)) {
        return createResponse({
          file: imageName,
          subfolder: options.body.get('subfolder') || 'workspace'
        })
      } else {
        return await uploadFile(
          options.body.get('image'),
          options.body.get('subfolder')
        )
      }
    }

    return originalFetchApi.call(object, path, options)
  }

  object.createSocket = (isReconnect?: boolean) => {}

  const originalGetNodeDefs = object.getNodeDefs
  object.getNodeDefs = async (): Promise<Record<string, ComfyNodeDef>> => {
    const nodeDefinitions = await originalGetNodeDefs.call(object)
    const nodeDefs = {}
    for (const [nodeType, nodeDef] of Object.entries(nodeDefinitions)) {
      if (nodeDef.input) {
        let newNodeDef = { ...nodeDef, input: {} }
        if (nodeDef.input.required) {
          newNodeDef.input.required = replaceSpecialValues({
            ...nodeDef.input.required
          })
        }
        if (nodeDef.input.optional) {
          newNodeDef.input.optional = replaceSpecialValues({
            ...nodeDef.input.optional
          })
        }
        nodeDefs[nodeType] = newNodeDef
      } else {
        nodeDefs[nodeType] = nodeDef
      }
    }
    return nodeDefs
  }

  function _updateDefs(rewrite, source) {
    const targetFoldersFiles =
      source === 'public'
        ? context.public_folders_files
        : context.private_folders_files
    updateFoldersFiles(context.volume_content, targetFoldersFiles, rewrite)
  }

  function updateFoldersFiles(data, folders_files, keepExisting = false) {
    // First, process existing keys in folders_files
    Object.keys(folders_files).forEach((key) => {
      processKey(key, data, folders_files, keepExisting)
    })

    // Then, look for new keys in data that aren't in folders_files
    data.contents.forEach((folder) => {
      const key = folder.path.split('/').pop() // Get the last part of the path as the key
      if (!folders_files.hasOwnProperty(key)) {
        folders_files[key] = [[], {}] // Initialize new key with empty arrays
        processKey(key, data, folders_files, keepExisting)
      }
    })
  }

  function processKey(key, data, folders_files, keepExisting) {
    const paths = Object.keys(folders_files[key][1])
    const searchPaths = paths.length ? paths : [`/${key}`]
    const uniqueFiles = new Set() // Using a Set to avoid duplicates

    if (keepExisting && folders_files[key][0]) {
      folders_files[key][0].forEach((file) => uniqueFiles.add(file))
    }

    data.contents.forEach((folder) => {
      searchPaths.forEach((path) => {
        const normalizedPath = path
          .replace('/public_models', '')
          .replace('/comfyui/models', '')
        const folderKey = normalizedPath.split('/').filter(Boolean).join('/')
        if (folder.path === folderKey) {
          const foundFiles = findFilesInData(folder, folderKey)
          foundFiles.forEach((file) => uniqueFiles.add(file)) // Add files to the Set
        }
      })
    })

    folders_files[key][0] = Array.from(uniqueFiles) // Convert Set back to Array
  }

  function findFilesInData(folder, basePath) {
    const foundFiles = []
    function searchFolder(currentFolder, currentPath) {
      currentFolder.contents.forEach((item) => {
        if (item.type === 'file') {
          const relativePath = getRelativePath(
            basePath,
            currentPath + '/' + basename(item.path)
          )
          foundFiles.push(relativePath)
        } else if (item.type === 'folder') {
          searchFolder(item, currentPath + '/' + basename(item.path))
        }
      })
    }
    searchFolder(folder, basePath)
    return foundFiles
  }

  async function updateNodeDefinitions() {
    const app = window.app
    const nodeDefs = await object.getNodeDefs()
    for (const nodeType in LiteGraph.registered_node_types) {
      const registeredNode = LiteGraph.registered_node_types[nodeType]
      const nodeDef = nodeDefs[nodeType]
      if (nodeDef) {
        registeredNode.nodeData = nodeDef
      }
    }
    for (const nodeId in app.graph._nodes) {
      const node = app.graph._nodes[nodeId]
      const nodeDef = nodeDefs[node.type]
      if (
        typeof node.refreshComboInNode === 'function' &&
        node.refreshComboInNode(nodeDefs)
      )
        if (nodeDef) {
          for (const widgetName in node.widgets) {
            const widget = node.widgets[widgetName]
            if (
              widget.type === 'combo' &&
              nodeDef.input.required[widget.name] !== undefined
            ) {
              widget.options.values = nodeDef.input.required[widget.name][0]
            }
          }
        }
    }
  }

  function replaceSpecialValues(definitions) {
    const getFromFolderFiles = (key) => {
      const publicContents = context.public_folders_files[key]
        ? context.public_folders_files[key][0]
        : []
      const privateContents = context.private_folders_files[key]
        ? context.private_folders_files[key][0]
        : []
      return { publicContents, privateContents }
    }

    for (const nodeType in definitions) {
      const definition = definitions[nodeType]

      if (Array.isArray(definition) && Array.isArray(definition[0])) {
        if (nodeType == 'video' || nodeType == 'default_video') {
          const { privateContents } = getFromFolderFiles('input')
          const video_extensions = ['webm', 'mp4', 'mkv', 'gif'] // from ComfyUI-VideoHelperSuite/videohelpersuite/load_video_nodes.py:15
          definitions[nodeType] = [
            [
              ...privateContents.filter((item) =>
                video_extensions.some((ext) =>
                  item.toLowerCase().endsWith(`.${ext}`)
                )
              )
            ],
            ...definition.slice(1)
          ]
          continue
        } else if (nodeType == 'image') {
          const { privateContents } = getFromFolderFiles('input')
          definitions[nodeType] = [[...privateContents], ...definition.slice(1)]
          continue
        } else if (nodeType == 'brushnet') {
          const { publicContents, privateContents } =
            getFromFolderFiles('inpaint')
          definitions[nodeType] = [
            [...privateContents, ...publicContents],
            ...definition.slice(1)
          ]
          continue
        }

        for (let i = 0; i < definition[0].length; i++) {
          // NOTE: potentially unused --------------- //
          if (definition[0][i] === '__models__') {
            definitions[nodeType] = [
              [...definition[0].slice(0, i), ...context.models],
              ...definition.slice(1)
            ]
          } else if (definition[0][i] === '__embeds__') {
            definitions[nodeType] = [
              [
                ...definition[0].slice(0, i),
                ...context.inputs
                  .filter((input) => input.startsWith('embeddings/'))
                  .map((input) => input.slice(11))
              ],
              ...definition.slice(1)
            ]
          }
          // --------------- //
          else if (definition[0][i] === '__inputs__') {
            const { privateContents } = getFromFolderFiles('input')
            // only allow privateInputs
            definitions[nodeType] = [
              [...definition[0].slice(0, i), ...privateContents],
              ...definition.slice(1)
            ]
          } else if (definition[0][i] === '__diffusion_models__') {
            const { publicContents, privateContents } =
              getFromFolderFiles('unet')
            const {
              publicContents: diffusion_models_publicContents,
              privateContents: diffusion_models_privateContents
            } = getFromFolderFiles('diffusion_models')
            definitions[nodeType] = [
              [
                ...definition[0].slice(0, i),
                ...privateContents,
                ...publicContents,
                ...diffusion_models_privateContents,
                ...diffusion_models_publicContents
              ],
              ...definition.slice(1)
            ]
          } else if (definition[0][i] === '__LLavacheckpoints__') {
            const { publicContents, privateContents } =
              getFromFolderFiles('LLavacheckpoints')
            const {
              publicContents: llm_gguf_publicContents,
              privateContents: llm_gguf_privateContents
            } = getFromFolderFiles('llm_gguf')
            definitions[nodeType] = [
              [
                ...definition[0].slice(0, i),
                ...privateContents,
                ...publicContents,
                ...llm_gguf_privateContents,
                ...llm_gguf_publicContents
              ],
              ...definition.slice(1)
            ]
          } else if (definition[0][i] === 'bbox/__ultralytics_bbox__') {
            const { publicContents, privateContents } =
              getFromFolderFiles('ultralytics')
            definitions[nodeType] = [
              [
                ...definition[0].slice(0, i),
                ...privateContents.map(
                  (item) => `bbox/${item.replace('ultralytics/', '')}`
                ),
                ...publicContents.map(
                  (item) => `bbox/${item.replace('ultralytics/', '')}`
                )
              ],
              ...definition.slice(1)
            ]
          } else if (definition[0][i] === 'bbox/__ultralytics_bbox__') {
            const { publicContents, privateContents } =
              getFromFolderFiles('ultralytics_bbox')
            definitions[nodeType] = [
              [
                ...definition[0].slice(0, i),
                ...privateContents.map((item) => `bbox/${item}`),
                ...publicContents.map((item) => `bbox/${item}`)
              ],
              ...definition.slice(1)
            ]
          } else if (definition[0][i] === 'bbox/__ultralytics_segm__') {
            const { publicContents, privateContents } =
              getFromFolderFiles('ultralytics_segm')
            definitions[nodeType] = [
              [
                ...definition[0].slice(0, i),
                ...privateContents.map((item) => `bbox/${item}`),
                ...publicContents.map((item) => `bbox/${item}`)
              ],
              ...definition.slice(1)
            ]
          }
          // xlabs
          else if (/^__xlabs_(.+)__$/.test(definition[0][i])) {
            const match = definition[0][i].match(/^__xlabs_(.+)__$/)
            const xlabsType = match[1]
            const { publicContents, privateContents } =
              getFromFolderFiles(`xlabs`)
            definitions[nodeType] = [
              [
                ...definition[0].slice(0, i),
                ...privateContents
                  .filter((item) => item.startsWith(xlabsType + '/'))
                  .map((item) => item.slice(xlabsType.length + 1)),
                ...publicContents
                  .filter((item) => item.startsWith(xlabsType + '/'))
                  .map((item) => item.slice(xlabsType.length + 1))
              ],
              ...definition.slice(1)
            ]
          }
          // xlabs
          else if (/^__.*__$/.test(definition[0][i])) {
            const key = definition[0][i].slice(2, -2) // Extract the key name between '__'
            console.log('key: ', key)
            const { publicContents, privateContents } = getFromFolderFiles(key)
            definitions[nodeType] = [
              [
                ...definition[0].slice(0, i),
                ...privateContents,
                ...publicContents
              ],
              ...definition.slice(1)
            ]
          }
        }
      }
    }
    return definitions
  }

  const handleMessage = (event) => {
    const app = window.app
    const message = event.data
    if (message.internal) {
      const internalMessage = message.internal
      switch (internalMessage.type) {
        case 'update_api_info': {
          context.api_info = internalMessage.data
          break
        }
        case 'refresh_defs': {
          // NOTE: potentially not used
          if (internalMessage.data.models) {
            context.models = internalMessage.data.models
          }
          // NOTE: potentially not used
          if (internalMessage.data.inputs) {
            context.inputs = internalMessage.data.inputs
          }
          if (internalMessage.data.volume_content) {
            context.volume_content = internalMessage.data.volume_content
            const source = internalMessage.data.source || 'private'
            _updateDefs(internalMessage.data.rewrite, source)
          }

          object.getNodeDefs().then((nodeDefs) => {
            app.registerNodesFromDefs(nodeDefs).then(() => {
              updateNodeDefinitions()
            })
          })
          break
        }
        default:
          console.warn(`Unknown event sent with type ${internalMessage.type}`)
      }
    }
  }

  window.addEventListener('message', handleMessage)

  return object
}
