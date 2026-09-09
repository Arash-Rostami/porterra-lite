<?php

return [
    'stack' => 'next',
    'skills' => ['.claude/skills/code-reviewer/SKILL.md', '.claude/skills/nextjs-performance/SKILL.md'],
    'serious_dirs' => '#(^|[\\\\/])(?:(?:src[\\\\/])?(?:app|components|lib|services|middleware|server|stores))([\\\\/]|$)#i',
    'code_roots' => ['app', 'src', 'components', 'lib', 'services', 'config', 'tests'],
];