"use client";

import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PolicyEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// Map logical groups to all their potential actions
const SCOPE_GROUPS = [
  {
    category: "Vaults",
    description: "Manage encrypted storage domains",
    scopes: [
      { action: "vaults:read", label: "Read Vaults", description: "View vault details and metadata" },
      { action: "vaults:create", label: "Create Vaults", description: "Provision new organizational vaults" },
      { action: "vaults:update", label: "Update Vaults", description: "Modify vault properties" },
      { action: "vaults:delete", label: "Delete Vaults", description: "Permanently destroy vaults" },
    ]
  },
  {
    category: "Secrets",
    description: "Manage encrypted payloads",
    scopes: [
      { action: "secrets:read", label: "Read Secrets", description: "View secret metadata and decrypt payloads" },
      { action: "secrets:create", label: "Create Secrets", description: "Add new secrets to a vault" },
      { action: "secrets:update", label: "Update Secrets", description: "Modify or rotate existing secret values" },
      { action: "secrets:delete", label: "Delete Secrets", description: "Remove secrets from a vault" },
      { action: "secrets:use", label: "Use Secrets", description: "Reference secrets in external workflows or shares" },
    ]
  },
  {
    category: "Cryptographic Keys",
    description: "Manage KMS Transit keys and encryption envelopes",
    scopes: [
      { action: "keys:read", label: "Read Keys", description: "View key metadata and versions" },
      { action: "keys:create", label: "Create Keys", description: "Generate new cryptographic keys" },
      { action: "keys:update", label: "Rotate Keys", description: "Force rotation to new key versions" },
      { action: "keys:delete", label: "Delete Keys", description: "Destroy keys (Caution: Data loss)" },
      { action: "keys:use", label: "Use Keys", description: "Perform encryption/decryption operations with keys" },
    ]
  },
  {
    category: "Folders (Secret Groups)",
    description: "Manage organizational folders within Vaults",
    scopes: [
      { action: "groups:read", label: "Read Folders", description: "View folders and their metadata" },
      { action: "groups:create", label: "Create Folders", description: "Establish new organizational folders" },
      { action: "groups:update", label: "Update Folders", description: "Rename or modify folder metadata" },
      { action: "groups:delete", label: "Delete Folders", description: "Remove folders from a vault" },
    ]
  }
];

export function PolicyEditor({ value, onChange }: PolicyEditorProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");

  // Determine if the current JSON can be safely rendered in the Visual Builder.
  // We only support simple ALLOW policies with resource "*" for visual editing.
  const parsedState = useMemo(() => {
    try {
      const statements = JSON.parse(value);
      if (!Array.isArray(statements)) return { isValid: false, actions: [], isComplex: true };

      let isComplex = false;
      const actions = new Set<string>();

      statements.forEach((stmt: any) => {
        if (stmt.effect !== "ALLOW") isComplex = true;
        if (!stmt.resources || !stmt.resources.includes("*") || stmt.resources.length > 1) {
            isComplex = true;
        }

        if (Array.isArray(stmt.actions)) {
          stmt.actions.forEach((act: string) => actions.add(act));
        }
      });

      return {
        isValid: true,
        isComplex,
        actions: Array.from(actions)
      };

    } catch (e) {
      return { isValid: false, isComplex: true, actions: [] };
    }
  }, [value]);

  // Effect to automatically lock the visual tab if complex logic is injected manually
  useEffect(() => {
    if (activeTab === "visual" && parsedState.isComplex && parsedState.isValid) {
      setActiveTab("json");
    }
  }, [parsedState.isComplex, parsedState.isValid, activeTab]);

  const handleScopeToggle = (action: string) => {
    if (parsedState.isComplex && parsedState.isValid) return; // Cannot edit complex visually

    const currentActions = new Set(parsedState.actions);
    
    // Check if handling wildcard "all in group"
    if (action.endsWith(":*")) {
      const prefix = action.slice(0, -2);
      const groupActions = SCOPE_GROUPS.find(g => g.scopes[0].action.startsWith(prefix))?.scopes.map(s => s.action) || [];
      
      const hasAll = groupActions.every(a => currentActions.has(a)) || currentActions.has(action);
      
      if (hasAll) {
         // remove all
         currentActions.delete(action);
         groupActions.forEach(a => currentActions.delete(a));
      } else {
         // add all
         currentActions.delete(action); // don't write actual literal * wildcard to keep it explicit for now
         groupActions.forEach(a => currentActions.add(a));
      }
    } else {
      if (currentActions.has(action)) {
        currentActions.delete(action);
        
        // Custom UX: If un-checking secrets:read, also uncheck folders:read
        if (action === "secrets:read" || action === "secrets:*") {
           currentActions.delete("groups:read");
        }

      } else {
        currentActions.add(action);
        
        // Custom UX: If checking secrets:read, automatically grant folders:read
        // so the user can actually navigate to the secrets they are allowed to see
        if (action === "secrets:read" || action === "secrets:*") {
           currentActions.add("groups:read");
        }
      }
      
      // Remove literal wildcard if we unticked a specific item
      const prefix = action.split(":")[0];
      if (currentActions.has(`${prefix}:*`)) {
          currentActions.delete(`${prefix}:*`);
          SCOPE_GROUPS.find(g => g.scopes[0].action.startsWith(prefix))?.scopes.forEach(s => {
              if (s.action !== action) currentActions.add(s.action);
          });
      }
    }

    // Generate new JSON
    const newActionsArray = Array.from(currentActions);
    
    // Optimization to use wildcards
    SCOPE_GROUPS.forEach(group => {
      const groupPrefix = group.scopes[0].action.split(":")[0];
      const allActionsInGroup = group.scopes.map(s => s.action);
      const hasAll = allActionsInGroup.every(a => newActionsArray.includes(a));
      
      if (hasAll) {
         // Replace array entries with wildcard
         allActionsInGroup.forEach(a => {
            const idx = newActionsArray.indexOf(a);
            if (idx > -1) newActionsArray.splice(idx, 1);
         });
         newActionsArray.push(`${groupPrefix}:*`);
      }
    });

    if (newActionsArray.length === 0) {
      // Default empty state
      onChange("[\n  {\n    \"effect\": \"ALLOW\",\n    \"actions\": [],\n    \"resources\": [\"*\"]\n  }\n]");
      return;
    }

    const newStatement = {
      effect: "ALLOW",
      actions: newActionsArray,
      resources: ["*"]
    };

    onChange(JSON.stringify([newStatement], null, 2));
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "visual" | "json")} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="visual" disabled={parsedState.isComplex && parsedState.isValid}>Visual Builder</TabsTrigger>
        <TabsTrigger value="json">JSON Editor</TabsTrigger>
      </TabsList>

      <TabsContent value="visual" className="m-0 space-y-4">
        {(!parsedState.isValid || parsedState.isComplex) ? (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Cannot Use Visual Builder</AlertTitle>
            <AlertDescription>
              {parsedState.isComplex && parsedState.isValid
                ? "This policy contains advanced attributes (DENY rules or specific Resource URNs) that cannot be safely edited in the visual builder. Please use the JSON editor."
                : "The current policy JSON is invalid or incorrectly formatted. Please fix the Syntax Error in the JSON Editor."}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-5 max-h-[50vh] min-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {SCOPE_GROUPS.map((group) => {
              const groupPrefix = group.scopes[0].action.split(":")[0];
              const isAllSelected = parsedState.actions.includes(`${groupPrefix}:*`) || 
                                    group.scopes.every(scope => parsedState.actions.includes(scope.action));
                                    
              const isIndeterminate = !isAllSelected && group.scopes.some(scope => parsedState.actions.includes(scope.action));

              return (
                <div key={group.category} className="rounded-xl border bg-card/40 shadow-sm overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="flex items-center space-x-3 bg-muted/20 px-5 py-4 border-b">
                    <Checkbox 
                       id={`group-${group.category}`} 
                       className="h-5 w-5 rounded-[4px] data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                       checked={isAllSelected ? true : isIndeterminate ? "indeterminate" : false}
                       onCheckedChange={() => handleScopeToggle(`${groupPrefix}:*`)}
                    />
                    <div className="leading-none flex-1">
                      <Label htmlFor={`group-${group.category}`} className="font-semibold text-[15px] cursor-pointer block">
                        {group.category}
                      </Label>
                      <p className="text-[13px] text-muted-foreground mt-1.5">{group.description}</p>
                    </div>
                  </div>
                  <div className="px-5 py-4 space-y-3 bg-background/50">
                    {group.scopes.map((scope) => {
                      const isSelected = parsedState.actions.includes(scope.action) || parsedState.actions.includes(`${groupPrefix}:*`);
                      
                      return (
                        <div key={scope.action} className="flex items-start space-x-3 rounded-md p-2 -ml-2 transition-colors hover:bg-muted/40">
                           <Checkbox 
                             id={scope.action} 
                             className="mt-0.5 rounded-[4px]"
                             checked={isSelected}
                             onCheckedChange={() => handleScopeToggle(scope.action)}
                           />
                           <div className="leading-none flex-1">
                              <Label htmlFor={scope.action} className="text-[14px] font-medium cursor-pointer block">
                                {scope.action}
                              </Label>
                              <p className="text-[12px] text-muted-foreground/80 mt-1.5">{scope.description}</p>
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="json" className="m-0">
         {!parsedState.isValid && (value || "").length > 5 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Syntax Error</AlertTitle>
              <AlertDescription>
                The current JSON is invalid. Saving this policy will fail.
              </AlertDescription>
            </Alert>
         )}
          <Textarea 
            value={value || ""} 
            onChange={(e) => onChange(e.target.value)} 
            className="font-mono text-xs min-h-[50vh] bg-[#0c0c0e]" 
            placeholder="[ { ... } ]"
          />
      </TabsContent>
    </Tabs>
  );
}
