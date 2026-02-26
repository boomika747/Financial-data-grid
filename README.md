# Big Data Grid - 1 Million Rows

A high-performance virtualized data grid capable of rendering one million rows of financial data at 60 FPS without performance degradation. Built using React and Vite, with no external virtualization dependencies.

## Setup Instructions

Ensure you have Docker and Node.js installed on your machine.

### 1. Generating the Dataset

Before running the application, you must generate the 1-million-row synthetic dataset:
```bash
npm install
npm run generate-data
```
The script will output `public/transactions.json` containing 1 million randomly generated transaction records.

### 2. Running with Docker Compose

To build and start the application using Nginx:
```bash
docker-compose up --build -d
```
The application will be accessible at `http://localhost:8080`.

### Development Server
If you prefer to run it locally without Docker:
```bash
npm run dev
```

## Virtualization Approach

To render 1 million rows without crashing the browser, we use a windowing (virtual scroll) technique:

1.  **Total Height Calculation**: The wrapper container simulates the full scroll height (`1 million * row height = 40,000,000px`).
2.  **Scroll Listener**: A `requestAnimationFrame`-throttled onScroll listener updates the React state with the current scroll position.
3.  **Visible Range Calculation**: We divide the scroll offset by row height to determine `startIndex`.
4.  **Translation**: The `grid-row-window` div (which contains the rendered DOM nodes) uses a GPU-accelerated CSS transform (`transform: translateY(...)`) to follow the visible frame, avoiding layout recalculations.
5.  **Data Slicing**: We only slice and map `data.slice(startIndex, endIndex + buffer)`. This guarantees that only a tiny fraction of DOM elements stay in memory at any point.

## Features Included
*   **Virtual Scrolling**: Constant DOM element count regardless of data size.
*   **Sorting & Filtering**: Optimized in-memory processing.
*   **Quick Filters**: Debounced filter input and buttons.
*   **Cell Editing**: Double click to edit cell content inline.
*   **Column Pinning**: Click to stick columns to the left-hand scroll axis.
*   **Multi-Selection**: Support for holding `Cmd / Ctrl` to multi-select.
*   **Debug HUD**: Frame rate overlay, viewport statistics, and visible scroll indexes.

## Environment Variables
See `.env.example` for required environment configurations.
# Financial-data-grid
