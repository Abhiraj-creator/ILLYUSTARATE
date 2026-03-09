import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
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
    if (name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.jsx')) {
      return { icon: 'javascript', color: 'text-yellow-400' }
    }
    if (name.endsWith('.css') || name.endsWith('.scss')) {
      return { icon: 'css', color: 'text-blue-400' }
    }
    if (name.endsWith('.json')) {
      return { icon: 'data_object', color: 'text-orange-400' }
    }
    if (name.endsWith('.md')) {
      return { icon: 'menu_book', color: 'text-amber-200' }
    }
    if (name === '.gitignore') {
      return { icon: 'settings', color: 'text-slate-400' }
    }
    if (isImageFile(name)) {
      return { icon: 'image', color: 'text-purple-400' }
    }
    if (isVideoFile(name)) {
      return { icon: 'movie', color: 'text-red-400' }
    }
    return { icon: 'description', color: 'text-slate-400' }
  }

  const isImageFile = (name: string) => {
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']
    return imageExts.some(ext => name.toLowerCase().endsWith(ext))
  }

  const isVideoFile = (name: string) => {
    const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
    return videoExts.some(ext => name.toLowerCase().endsWith(ext))
  }

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isSelected = selectedFile?.path === node.path
      const paddingLeft = depth === 0 ? 16 : 16 + depth * 16

      return (
        <div key={node.path}>
          <div
            className={`flex items-center gap-3 py-1.5 hover:bg-[#4a2040]/30 cursor-pointer group ${isSelected ? 'bg-[#4a2040]/80 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
            style={{ paddingLeft: `${paddingLeft}px`, paddingRight: '16px' }}
            onClick={() => handleToggle(node)}
          >
            {node.type === 'dir' ? (
              <>
                <span className="material-symbols-outlined text-[16px] text-[#ab9db9]">
                  {node.isOpen ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                </span>
                <span className="material-symbols-outlined text-[16px] text-[#ab9db9]">
                  {node.isOpen ? 'folder_open' : 'folder'}
                </span>
                <span className="text-milk/80 text-sm truncate">{node.name}</span>
              </>
            ) : (
              <>
                {depth > 0 && <span className="w-4" />}
                <span className={`material-symbols-outlined text-[16px] ${getFileIcon(node.name).color}`}>
                  {getFileIcon(node.name).icon}
                </span>
                <span className={`text-sm truncate ${isSelected ? 'text-milk font-medium' : 'text-milk/80'}`}>
                  {node.name}
                </span>
              </>
            )}
          </div>
          {node.type === 'dir' && node.isOpen && node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      )
    })
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#191022]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#191022] font-display text-slate-100 relative selection:bg-primary selection:text-white">
      {/* Sidebar Explorer */}
      <aside className={`w-64 bg-[#2a1127] flex flex-col border-r border-[#5e2d52]/50 shrink-0 ${selectedFile ? 'hidden lg:flex' : 'flex flex-1 lg:flex-none'}`}>
        <div className="p-4 flex items-center justify-between text-[#ab9db9] border-b border-[#5e2d52]/50 uppercase text-[10px] font-bold tracking-[0.2em]">
          <span>Explorer</span>
          <span className="material-symbols-outlined text-xs">more_horiz</span>
        </div>

        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          <div className="px-4 py-1 flex items-center gap-2 text-milk/40 text-[11px] uppercase tracking-widest font-bold mb-1">
            <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
            <span className="truncate">{repository.name}</span>
          </div>
          <div className="space-y-0.5 pb-4">
            {renderTree(fileTree)}
          </div>
        </div>

        <div className="p-4 bg-[#191022]/50 border-t border-[#5e2d52]/50 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-emerald-500">commit</span>
            <span className="text-[10px] text-[#ab9db9] font-mono uppercase truncate max-w-[120px]">{repository.defaultBranch} Branch</span>
          </div>
          <span className="material-symbols-outlined text-xs text-[#ab9db9] cursor-pointer hover:text-white transition-colors">sync</span>
        </div>
      </aside>

      {/* Main File View */}
      <main className={`flex-1 flex flex-col bg-[#0a0008] min-w-0 ${!selectedFile ? 'hidden lg:flex' : 'flex'}`}>
        {selectedFile ? (
          <>
            {/* File Tab Header */}
            <div className="flex items-center bg-[#191022] border-b border-[#2a1127]/50 shrink-0 overflow-x-auto custom-scrollbar">
              <div className="flex items-center px-4 py-3 bg-[#0a0008] border-t-2 border-t-primary gap-3 shrink-0 relative lg:min-w-fit w-full lg:w-auto">
                <button onClick={() => setSelectedFile(null)} className="lg:hidden absolute left-4 text-[#ab9db9] hover:text-white">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                <div className="flex items-center gap-3 lg:ml-0 ml-8">
                  <span className={`material-symbols-outlined text-[16px] ${getFileIcon(selectedFile.name).color}`}>
                    {getFileIcon(selectedFile.name).icon}
                  </span>
                  <span className="text-milk text-xs font-semibold tracking-wide">{selectedFile.name}</span>
                </div>
                <button onClick={() => setSelectedFile(null)} className="ml-4 flex opacity-50 hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[14px] text-[#ab9db9] hover:text-white">close</span>
                </button>
              </div>
            </div>

            {/* File Content Area */}
            <div className="flex-1 overflow-auto flex font-mono text-[13px] leading-relaxed relative custom-scrollbar">
              <FileContentViewer
                file={selectedFile}
                content={fileContent}
                owner={repository.owner}
                repo={repository.name}
                branch={repository.defaultBranch}
              />
            </div>

            {/* Footer Status Bar */}
            <footer className="h-6 bg-primary px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4 text-[10px] font-bold text-milk uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">fork_right</span>
                  <span className="truncate max-w-[100px]">{repository.defaultBranch}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold text-milk uppercase tracking-wider">
                <span className="hidden sm:inline">UTF-8</span>
                <span className="hidden sm:inline">Spaces: 2</span>
                <span className="truncate max-w-[100px]">
                  {isImageFile(selectedFile.name) ? 'Image' : isVideoFile(selectedFile.name) ? 'Video' : 'Text'}
                </span>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-[#ab9db9]">
              <span className="material-symbols-outlined text-4xl mb-4 opacity-50">deployed_code</span>
              <p className="font-mono text-sm">Select a file from the explorer</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

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

  const getRawUrl = () => {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`
  }

  if (isImage(file.name)) {
    return (
      <div className="p-8 flex items-center justify-center w-full h-full bg-[#0a0008]">
        <img
          src={getRawUrl()}
          alt={file.name}
          className="max-w-full max-h-full object-contain rounded shadow-lg border border-[#2a1127]"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
            const parent = (e.target as HTMLImageElement).parentElement
            if (parent) {
              parent.innerHTML = '<div class="text-[#ab9db9] font-mono text-xs">Failed to load image rendering</div>'
            }
          }}
        />
      </div>
    )
  }

  if (isVideo(file.name)) {
    return (
      <div className="p-8 flex items-center justify-center w-full h-full bg-[#0a0008]">
        <video
          src={getRawUrl()}
          controls
          className="max-w-full max-h-full rounded shadow-lg border border-[#2a1127]"
          onError={(e) => {
            const parent = (e.target as HTMLVideoElement).parentElement
            if (parent) {
              parent.innerHTML = '<div class="text-[#ab9db9] font-mono text-xs">Failed to load video stream</div>'
            }
          }}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  const lines = content.split('\n')

  return (
    <div className="flex w-full min-w-max">
      {/* Line Numbers */}
      <div className="w-12 bg-[#0a0008] border-r border-[#2a1127] py-4 flex flex-col items-end pr-3 select-none text-[#ab9db9]/40 sticky left-0 z-10 font-mono text-[13px] leading-relaxed shrink-0">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      {/* Code Content */}
      <div className="py-4 px-6 overflow-visible w-full font-mono text-[13px] leading-relaxed text-milk/80 whitespace-pre">
        {content === 'Loading...' ? (
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="w-4 h-4 animate-spin" /> Fetching raw source...
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  )
}

