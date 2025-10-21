default: help

PROJECTNAME=$(shell basename "$(PWD)")
	
SITE_DIR=.
DEV_SERVER_PORT=1313
DEV_BIND_ADDRESS=0.0.0.0

## run-dev: run hugo development server (0.0.0.0:1313)
run-dev:
	@echo " > Running Development Server..."
	cd ${SITE_DIR} && \
		hugo server \
			--cleanDestinationDir \
			--noHTTPCache \
			--renderToMemory \
			--bind ${DEV_BIND_ADDRESS} \
			--port ${DEV_SERVER_PORT} \
			--appendPort \
			--printMemoryUsage \
			--printI18nWarnings \
			--printPathWarnings \
			--printUnusedTemplates \
			--noChmod

.PHONY: help
all: help
help: Makefile
	@echo "Choose a command to run in "$(PROJECTNAME)":"
	@echo
	@sed -n 's/^##//p' $< | column -t -s ':' |  sed -e 's/^/ /'
	@echo
