import os

filepath = r"e:\code\plugins\zhao-channel\server\src\content-types\index.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

plugin_options_block = '''      options: {
        draftAndPublish: false
      },
      pluginOptions: {
        "content-manager": {
          visible: true
        },
        "content-type-builder": {
          visible: false
        }
      },
      attributes: {'''

old_block = '''      options: {
        draftAndPublish: false
      },
      attributes: {'''

if content.count(old_block) != 5:
    print(f"ERROR: expected 5 occurrences of the pattern, found {content.count(old_block)}")
    exit(1)

new_content = content.replace(old_block, plugin_options_block)
count = new_content.count(plugin_options_block)
print(f"Replaced {count} occurrences")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done - file updated successfully")
