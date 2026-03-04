Workflow Explanation

on: push/pull_request	        -   Triggers CI on commits to main or PRs targeting main
runs-on: ubuntu-latest	      -   Use Ubuntu VM for consistent environment
strategy.matrix.node-version	-   Test Node 18.x (matches package.json)
actions/checkout@v4	          -   Checks out repo code for CI
actions/setup-node@v3	        -   Installs Node.js and caches node_modules
npm ci	                      -   Installs exact versions from package-lock.json
npm test	                    -   Runs Jest tests in tests/ folder
actions/upload-artifact@v3	  -   Optional: saves coverage report artifacts for inspection
