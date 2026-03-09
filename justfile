set shell := ["bash", "-cu"]

install:
	bun install

build:
	bun run build:packages

test:
	bun test

typecheck:
	bunx tsc --noEmit

changeset:
	bun run changeset
