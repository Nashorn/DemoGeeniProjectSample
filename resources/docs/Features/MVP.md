# MVP

## Purpose
An MVP Release Features

## Features
**Snapshot Controls**

    ```
    → Chooses mode:
        Responsive  → HTML
        Static      → PNG
    → Take Snapshot
    → Preview
    → Add Hotspots
    → Wire Hotspots
    ```

1. **Snapshot Manager :: IDE Extension**

    ```
    → Browse Snapshot Thumbnails
        → By Category
        → Search
    → Choose Thumbnail 
        → Full View > Browser Pane
    → Browse Triggers
        → Add New
            → From an Active Bounding Box
            → From an Active Selected Element
        → Remove
        → Drag to Sort Order
        → Modify
            → Description, Name, Selector, ID, Tracking, 
            → Action, Pulsing Hints, Highlights,
            → Tour Guide Step (If Add-On Purchased), 
            → Trigger Type: [Date, Time, Money, Text, Image, Input]
            → Background Color: allows translucent or "white-out" overlay effect
            → Decorator: Choose component; allows masking; component overlay
                → Example: Date Component fills trigger; overlays region on screen defined by trigger rect. Use to turn static region on screen into dynamic overlayed elements.
        → Wiring:
            → Conditions Editor:
                → When [Variable.X] [is True] and [Variable.Role] [is 'Employee']
                    → Action Editor:
                        → Select Action (Pick from Built-in Controller Methods), Example:
                            → [Redirect ] - Pick from List of Snapshots
                            → [Recording] - Pick from List of Recordings
                            → [Reveal   ] - Pick from List of Components
                        → Or, Custom User-Defined Methods
            → Action Editor:
                → Select Action (Pick from List of Built-in Controller Methods), Example:
                    → [Redirect ] - Pick from List of Snapshots
                    → [Recording] - Pick from List of Recordings
                    → [Reveal   ] - Pick from List of Components
                → Or, Custom User-Defined Methods
            
            Example:
            ((
                Action editor is shown for each method.
                    → Example: Choosing 'Redirect' will render ui controls for redirecting; selecting a screen from library; specify redirect options, etc.
            ))
    ```


2. **Snapshot Tools**

    ```
    → Define a Snapshot Region on Stage:
        → Draw Bounding Box, OR
        → Select Element
    → Save Region as Trigger
    → Convert PNG Region to HTML (Only available on Snapshot copy)
    → Convert HTML Region to PNG Base64
    → Recordings
        → With Region Selected on Live Site
        → With Mode Set As: HTML | PNG
        → Click "Record" or CMD+R to start a Recording
            PNG MODE:
                → User Interacts, Poses UI
                → [Takes Snapshot]
            HTML MODE:
                → Mutations Taken as User Interacts
        → ESC - Ends Recording
        → Recording saved for current screen
    ```


3. **Selection Tools**
```
    → Node Select Tool
        → Highlights nodes on screen
        → Click to select node
    → Bounding-Box Select Tool
        → Activates Select Tool
        → When node selected:
            → Bounding box is drawn around selected node
            → Drag and resize bounds
```

4. **Contextual Actions on Selections**
```
→ Context Actions
    Universal Actions
        → Save Selection
        → Load Selection
        → Save as Trigger
            IN HTML MODE:
                → css selector path
            IN PNG MODE:
                → bounding box rectangle coords
        → To Bounds
            [Converts] Node selection to resizable bounding box selection
        → Start Recording
            → [Mode] On|Off 
            → [Constraints] Camera Locked to Bounds/Selection
            → [Creates] New FilmStrip to group all snapshots taken while Recording Mode=On


    → When Selection:
        IN HTML MODE:
            → Flatten Element; 
                [Converts] rasterizes node as in-line base64 micro snapshot within html flow
            → Take Snapshot 
                → 1. [Saves] selector path of snapshot area to observe
                → 2. [Saves] DOM mutations of snapshot area
                    → ... as local clip
                    → ...as part of film-strip clip [if Recording Mode=On].
                → 3. [Saves] last touch/mouse points for clip as a Trigger
                → 4. [Exports] object array [{}] of bounding rects, mutations, Triggers
        IN PNG MODE:
            → Take Snapshot
                → 1. [Saves] bounding rect/coords for snapshot area
                → 2. [Creates] PNG of snapshot area
                    → ...as local image asset
                    → ...as part of film-strip clip [if Recording Mode=On].
                → 3. [Saves] last touch/mouse points for clip as a Trigger
                → 4. [Exports] object array [{}] of bounding rects, images, Triggers
```

