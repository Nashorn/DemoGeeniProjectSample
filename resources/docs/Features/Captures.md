# State Timeline UI — Microshot Bundle Capture

## Purpose
Let authors capture multiple visual states of a UI component (e.g., closed → open → expanded) as microshots, each with its own hotspot area, then cycle them at runtime via Action Binding.

## What you see
- A horizontal **timeline** with state slots (Closed → Open → Expanded).  
- Each slot shows a **thumbnail**, a **hotspot overlay preview**, and an **editable name**.

## Workflow
1. **Start Bundle** → timeline opens with **“+ State”**.  
2. **Capture State** → pick element or draw region → set padding → **Capture** → IDE prompts to **draw hotspot** for that state.  
3. **Repeat** for additional states.  
4. **Reorder** by dragging thumbnails.  
5. **Preview (Play)** cycles states and updates the active hotspot.

## Editing (explicit actions)
- **Retake a microshot**: **click the state’s thumbnail** → choose **Retake** (recaptures the image for that state).  
- **Rename a state**: click the state name under its thumbnail → type.  
- **Change hotspot area for a state**: **click the state’s thumbnail to select it** → adjust the hotspot box in the preview (drag to move, drag corners to resize).  
- **Delete a state**: hover the thumbnail → click **Trash**.  
- **Set transition for the bundle**: open **Bundle Settings** (gear icon) → pick **Fade / Slide / None**.  
- **Set action binding**: select the bundle’s hotspot → **Action** dropdown → **Cycle**, **Goto (screen)**, or **Controller method** (e.g., `toggleUserMenu()`).

## Export result
- **Files**: one image per state (e.g., `dropdown_closed.png`, `dropdown_open.png`).  
- **Manifest**: state order, **per-state hotspot area(s)**, and transition type; Action Binding ties the bundle to its runtime behavior.
