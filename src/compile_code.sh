#!/bin/bash

# Clear the compilation file first
> ./code_compilation.txt

# Function to append file content with path to compilation file
append_file() {
  local file_path="$1"
  if [ -f "$file_path" ]; then
    echo -e "\n\nFile: $file_path\n" >> ./code_compilation.txt
    cat "$file_path" >> ./code_compilation.txt
    echo "Added: $file_path"
  else
    echo "Warning: File not found - $file_path"
  fi
}

append_file "/workspace/src/components/use-scroll-to-bottom.ts"
append_file "/workspace/src/components/version-footer.tsx"
append_file "/workspace/src/components/visibility-selector.tsx"
append_file "/workspace/src/components/weather.tsx"
append_file "/workspace/src/components/submit-button.tsx"       
append_file "/workspace/src/components/suggested-actions.tsx"   
append_file "/workspace/src/components/suggestion.tsx"          
append_file "/workspace/src/components/telemetry-provider.tsx"  
append_file "/workspace/src/components/text-editor.tsx"         
append_file "/workspace/src/components/theme-provider.tsx"
append_file "/workspace/src/components/toolbar.tsx"
append_file "/workspace/src/components/tool-call-renderer.tsx"
append_file "/workspace/src/components/tool-confirmation.tsx"          
append_file "/workspace/src/components/overview.tsx"            
append_file "/workspace/src/components/preview-attachment.tsx"           
append_file "/workspace/src/components/sheet-editor.tsx"        
append_file "/workspace/src/components/sidebar-history.tsx"     
append_file "/workspace/src/components/sidebar-toggle.tsx"      
append_file "/workspace/src/components/sidebar-user-nav.tsx"    
append_file "/workspace/src/components/sign-out-form.tsx"       
append_file "/workspace/src/components/mcp-server-button.tsx"         
append_file "/workspace/src/components/mcp-server-config-dialog.tsx"  
append_file "/workspace/src/components/message-actions.tsx"           
append_file "/workspace/src/components/message-editor.tsx"            
append_file "/workspace/src/components/message-reasoning.tsx"         
append_file "/workspace/src/components/messages.tsx"                  
append_file "/workspace/src/components/message.tsx"                   
append_file "/workspace/src/components/model-selector.tsx"            
append_file "/workspace/src/components/multimodal-input.tsx"          
append_file "/workspace/src/components/frontend-observability.tsx"   
append_file "/workspace/src/components/icons.tsx"                    
append_file "/workspace/src/components/image-editor.tsx"             
append_file "/workspace/src/components/markdown.tsx"                 
append_file "/workspace/src/components/mcp-config-dialog.tsx"        
append_file "/workspace/src/components/mcp-config-form.tsx"          
append_file "/workspace/src/components/mcp-connection-linker.tsx"    
append_file "/workspace/src/components/mcp-connection-provider.tsx"  
append_file "/workspace/src/components/mcp-example-configs.tsx"      
append_file "/workspace/src/components/code-block.tsx"           
append_file "/workspace/src/components/code-editor.tsx"          
append_file "/workspace/src/components/console.tsx"              
append_file "/workspace/src/components/create-artifact.tsx"      
append_file "/workspace/src/components/data-stream-handler.tsx"  
append_file "/workspace/src/components/diffview.tsx"             
append_file "/workspace/src/components/document-preview.tsx"     
append_file "/workspace/src/components/document-skeleton.tsx"    
append_file "/workspace/src/components/document.tsx"             
append_file "/workspace/src/components/active-mcp-servers.tsx"     
append_file "/workspace/src/components/app-sidebar.tsx"            
append_file "/workspace/src/components/artifact-actions.tsx"       
append_file "/workspace/src/components/artifact-close-button.tsx"  
append_file "/workspace/src/components/artifact-messages.tsx"      
append_file "/workspace/src/components/artifact.tsx"               
append_file "/workspace/src/components/auth-form.tsx"              
append_file "/workspace/src/components/chat-header.tsx"            
append_file "/workspace/src/components/chat.tsx"           

echo "Compilation complete: ./code_compilation.txt"


        