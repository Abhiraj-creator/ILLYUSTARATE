import { useState, useEffect } from 'react'
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown,
  FileCode,
  FileJson,
  FileType,
  Loader2
} from 'lucide-react'
import { GitHubApi } from '@infrastructure/api/GitHubApi'
import { supabase } from '@infrastructure/storage/SupabaseClient'
import type { Repository } from '@domain/entities/Repository'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileNode[]
  content?: string
  isOpen?: boolean
}

interface FileExplorerProps {
  repository: Repository
}

export function FileExplorer({ repository }: FileExplorerProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [fileContent, setFileContent] = useState<string>('')

  useEffect(() => {
    loadFileTree()
  }, [repository])

  const loadFileTree = async () => {
    setLoading(true)
    try {
      // Get GitHub access token from session
      const { data: { session } } = await supabase.auth.getSession()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accessToken = (session as any)?.provider_token
      
      if (!accessToken) {
        console.error('No GitHub access token found')
        setLoading(false)
        return
      }

      // Fetch real file tree from GitHub
      const github = new GitHubApi(accessToken)
      const treeItems = await github.getRepoTree(repository.owner, repository.name)
      
      // Build file tree from GitHub tree items
      const tree = buildFileTree(treeItems)
      setFileTree(tree)
    } catch (error) {
      console.error('Failed to load file tree:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildFileTree = (items: { path: string; type: 'blob' | 'tree' }[]): FileNode[] => {
    const root: FileNode[] = []
    const nodeMap = new Map<string, FileNode>()

    // Sort items by path depth (shallow first)
    const sortedItems = [...items].sort((a, b) => {
      const depthA = a.path.split('/').length
      const depthB = b.path.split('/').length
      return depthA - depthB
    })

    for (const item of sortedItems) {
      const parts = item.path.split('/')
      const name = parts[parts.length - 1]
      const isDir = item.type === 'tree'

      const node: FileNode = {
        name,
        path: item.path,
        type: isDir ? 'dir' : 'file',
        children: isDir ? [] : undefined,
      }

      nodeMap.set(item.path, node)

      if (parts.length === 1) {
        // Root level item
        root.push(node)
      } else {
        // Nested item - add to parent
        const parentPath = parts.slice(0, -1).join('/')
        const parent = nodeMap.get(parentPath)
        if (parent && parent.children) {
          parent.children.push(node)
        }
      }
    }

    return root
  }

  const toggleFolder = (node: FileNode, tree: FileNode[]): FileNode[] => {
    return tree.map((item) => {
      if (item.path === node.path) {
        return { ...item, isOpen: !item.isOpen }
      }
      if (item.children) {
        return { ...item, children: toggleFolder(node, item.children) }
      }
      return item
    })
  }

  const handleToggle = (node: FileNode) => {
    if (node.type === 'dir') {
      setFileTree((prev) => toggleFolder(node, prev))
    } else {
      loadFileContent(node)
    }
  }

  const loadFileContent = async (node: FileNode) => {
    setSelectedFile(node)
    
    // Handle image and video files specially
    if (isImageFile(node.name) || isVideoFile(node.name)) {
      setFileContent('') // Clear content for media files
      return
    }
    
    setFileContent('Loading...')
    
    try {
      // Get GitHub access token from session
      const { data: { session } } = await supabase.auth.getSession()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accessToken = (session as any)?.provider_token
      
      if (!accessToken) {
        setFileContent('Error: No GitHub access token found')
        return
      }

      // Fetch real file content from GitHub
      const github = new GitHubApi(accessToken)
      const content = await github.getFileContent(
        repository.owner, 
        repository.name, 
        node.path,
        repository.defaultBranch
      )
      
      setFileContent(content)
    } catch (error) {
      console.error('Failed to load file content:', error)
      setFileContent(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getFileIcon = (name: string) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.jsx')) return <FileCode className="w-4 h-4 text-blue-400" />
    if (name.endsWith('.json')) return <FileJson className="w-4 h-4 text-yellow-400" />
    if (name.endsWith('.md')) return <FileType className="w-4 h-4 text-white" />
    if (isImageFile(name)) return <div className="w-4 h-4 bg-purple-500 rounded text-xs flex items-center justify-center text-white">IMG</div>
    if (isVideoFile(name)) return <div className="w-4 h-4 bg-red-500 rounded text-xs flex items-center justify-center text-white">VID</div>
    return <File className="w-4 h-4 text-slate-400" />
  }

  const isImageFile = (name: string) => {
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']
    return imageExts.some(ext => name.toLowerCase().endsWith(ext))
  }

  const isVideoFile = (name: string) => {
    const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
    return videoExts.some(ext => name.toLowerCase().endsWith(ext))
  }

  const isTextFile = (name: string) => {
    const textExts = ['.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.yaml', '.yml', '.xml', '.csv', '.log', '.env', '.gitignore', '.swift', '.java', '.py', '.go', '.rs', '.c', '.cpp', '.h', '.php', '.rb', '.sh', '.bat']
    return textExts.some(ext => name.toLowerCase().endsWith(ext))
  }

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-800 cursor-pointer ${
            selectedFile?.path === node.path ? 'bg-slate-800' : ''
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => handleToggle(node)}
        >
          {node.type === 'dir' ? (
            <>
              {node.isOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
              <Folder className="w-4 h-4 text-indigo-400" />
            </>
          ) : (
            <>
              <span className="w-4" />
              {getFileIcon(node.name)}
            </>
          )}
          <span className={`text-sm ${node.type === 'dir' ? 'text-slate-300' : 'text-slate-400'}`}>
            {node.name}
          </span>
        </div>
        {node.type === 'dir' && node.isOpen && node.children && (
          <div>{renderTree(node.children, depth + 1)}</div>
        )}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Mobile: Show file tree or content based on selection */}
      <div className={`lg:hidden h-full ${selectedFile ? 'hidden' : 'block'}`}>
        {/* Mobile File Tree */}
        <div className="h-full border-r border-slate-700 bg-slate-900 overflow-y-auto">
          <div className="p-3 border-b border-slate-700">
            <h3 className="text-sm font-medium text-white">Files</h3>
          </div>
          <div className="py-2">{renderTree(fileTree)}</div>
        </div>
      </div>

      {/* Mobile: File Content with back button */}
      <div className={`lg:hidden h-full ${selectedFile ? 'block' : 'hidden'}`}>
        <div className="h-full bg-slate-900 overflow-auto">
          {selectedFile ? (
            <div className="h-full flex flex-col">
              <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center gap-3">
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
                >
                  ← Back
                </button>
                <span className="text-sm text-slate-300 truncate">{selectedFile.path}</span>
              </div>
              <div className="flex-1 overflow-auto">
                <FileContentViewer 
                  file={selectedFile} 
                  content={fileContent}
                  owner={repository.owner}
                  repo={repository.name}
                  branch={repository.defaultBranch}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              Select a file to view its content
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Side-by-side layout */}
      {/* File Tree */}
      <div className="hidden lg:block w-80 border-r border-slate-700 bg-slate-900 overflow-y-auto">
        <div className="p-3 border-b border-slate-700">
          <h3 className="text-sm font-medium text-white">Files</h3>
        </div>
        <div className="py-2">{renderTree(fileTree)}</div>
      </div>

      {/* File Content */}
      <div className="hidden lg:block flex-1 bg-slate-900 overflow-auto">
        {selectedFile ? (
          <div>
            <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
              <span className="text-sm text-slate-300">{selectedFile.path}</span>
              {!isImageFile(selectedFile.name) && !isVideoFile(selectedFile.name) && (
                <span className="text-xs text-slate-500">
                  {fileContent.split('\n').length} lines
                </span>
              )}
            </div>
            <FileContentViewer 
              file={selectedFile} 
              content={fileContent}
              owner={repository.owner}
              repo={repository.name}
              branch={repository.defaultBranch}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            Select a file to view its content
          </div>
        )}
      </div>
    </div>
  )
}

// File Content Viewer Component - handles text, images, and videos
interface FileContentViewerProps {
  file: FileNode
  content: string
  owner: string
  repo: string
  branch: string
}

function FileContentViewer({ file, content, owner, repo, branch }: FileContentViewerProps) {
  const isImage = (name: string) => {
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']
    return imageExts.some(ext => name.toLowerCase().endsWith(ext))
  }

  const isVideo = (name: string) => {
    const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
    return videoExts.some(ext => name.toLowerCase().endsWith(ext))
  }

  // Construct raw GitHub URL for media files
  const getRawUrl = () => {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`
  }

  if (isImage(file.name)) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <img 
          src={getRawUrl()} 
          alt={file.name}
          className="max-w-full max-h-[70vh] object-contain rounded-lg"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
            const parent = (e.target as HTMLImageElement).parentElement
            if (parent) {
              parent.innerHTML = '<div class="text-slate-500">Failed to load image</div>'
            }
          }}
        />
      </div>
    )
  }

  if (isVideo(file.name)) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <video 
          src={getRawUrl()} 
          controls
          className="max-w-full max-h-[70vh] rounded-lg"
          onError={(e) => {
            const parent = (e.target as HTMLVideoElement).parentElement
            if (parent) {
              parent.innerHTML = '<div class="text-slate-500">Failed to load video</div>'
            }
          }}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // Default: show as text/code
  return (
    <pre className="p-4 text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-words">
      <code>{content}</code>
    </pre>
  )
}
