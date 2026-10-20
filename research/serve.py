"""Local-only launcher; optionally load allowlisted server settings without shell evaluation."""
import argparse
import logging
import os


KEYS = ('RESEARCH_RUNNER_TOKEN', 'TREG_TOKEN', 'OPENROUTER_API_KEY')


def load_provider_vars(path):
    from dotenv import dotenv_values
    # Do not source/evaluate shell code or interpolate other environment variables.
    values = dotenv_values(path, interpolate=False)
    for key in KEYS:
        if not os.environ.get(key) and values.get(key):
            os.environ[key] = values[key]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--provider-vars', help='Explicit existing ignored server-only dotenv file')
    parser.add_argument('--port', type=int, default=8080)
    args = parser.parse_args()
    os.umask(0o077)
    os.environ['PYTHON_DOTENV_DISABLED'] = '1'
    if args.provider_vars:
        logging.getLogger('dotenv.main').disabled = True
        load_provider_vars(args.provider_vars)
    import uvicorn
    uvicorn.run('research.api:app', host='127.0.0.1', port=args.port, workers=1, access_log=False)


if __name__ == '__main__':
    main()
