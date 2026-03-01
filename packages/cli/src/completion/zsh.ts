/**
 * Generate a zsh completion script for the Herald CLI.
 */
export function generateZshCompletions(): string {
  return `#compdef herald

_herald() {
  local -a commands
  commands=(
    'status:Show Herald daemon status'
    'agents:List registered agents'
    'run:Trigger an agent run'
    'paper:View the Herald newspaper'
    'report:View agent reports'
    'chat:Open an interactive chat session with an agent'
    'logs:View agent run logs'
    'dash:Open interactive TUI dashboard'
    'completions:Generate shell completions'
  )

  _arguments -C \\
    '1:command:->command' \\
    '*::arg:->args'

  case "\$state" in
    command)
      _describe -t commands 'herald commands' commands
      ;;
    args)
      case "\$line[1]" in
        status)
          _arguments \\
            '--json[Output raw JSON]'
          ;;
        agents)
          _arguments \\
            '--json[Output raw JSON]'
          ;;
        run)
          _arguments \\
            '1:agent-name:_herald_agents' \\
            '--prompt[Custom prompt for the agent]:prompt:'
          ;;
        paper)
          _arguments \\
            '--json[Output raw JSON]' \\
            '--history[List past editions]' \\
            '--date[View a specific edition by date]:date:' \\
            '--weekly[View latest weekly synthesis]'
          ;;
        report)
          _arguments \\
            '1:agent-name:_herald_agents' \\
            '--json[Output raw JSON]' \\
            '--latest[Display the most recent report]'
          ;;
        chat)
          _arguments \\
            '1:agent-name:_herald_agents'
          ;;
        logs)
          _arguments \\
            '1:agent-name:_herald_agents' \\
            '--json[Output raw JSON]'
          ;;
        dash)
          _arguments \\
            '--poll[Polling interval in milliseconds]:interval:'
          ;;
        completions)
          _arguments \\
            '--install[Install completions to shell config]' \\
            '--shell[Specify shell]:shell:(zsh bash fish)'
          ;;
      esac
      ;;
  esac
}

_herald_agents() {
  local -a agents
  agents=("\${(@f)$(herald __complete agents 2>/dev/null)}")
  if [[ -n "\${agents[1]}" ]]; then
    compadd -a agents
  fi
}

_herald "\$@"
`;
}
