"""Run on the deployment host after the isolated build has passed."""
import json
import subprocess
from pathlib import Path

RELEASE = Path('/opt/evershop/releases/languages-20261027')
IMAGE = 'evershop-local:languages-20261027'
OLD = 'evershop-before-languages-20261027'


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


spec = json.loads((RELEASE / 'container-before.json').read_text())[0]
assert spec['Name'] == '/evershop'
assert 'LANGUAGE_ADMIN_BUILD_OK' in (RELEASE / 'build.log').read_text()
args = ['create', '--name', 'evershop', '--restart', spec['HostConfig']['RestartPolicy']['Name']]
for env in spec['Config']['Env']:
    args += ['--env', env]
for mount in spec['Mounts']:
    assert mount['Type'] == 'bind', 'Unexpected mount type: abort rather than omit data'
    args += ['--volume', f"{mount['Source']}:{mount['Destination']}" + ('' if mount['RW'] else ':ro')]
networks = list(spec['NetworkSettings']['Networks'])
assert len(networks) == 1, 'Review multiple networks manually'
args += ['--network', networks[0], '--workdir', spec['Config']['WorkingDir']]
for port, bindings in spec['HostConfig']['PortBindings'].items():
    for binding in bindings:
        args += ['--publish', f"{binding['HostIp']}:{binding['HostPort']}:{port}"]
args += [IMAGE, *spec['Config']['Cmd']]

docker('stop', 'evershop')
docker('rename', 'evershop', OLD)
try:
    docker(*args)
    docker('start', 'evershop')
    print('RELEASE_STARTED; original container retained as ' + OLD)
except Exception:
    # Keep failed replacement for diagnosis, never delete the original container.
    existing = docker('ps', '-aq', '--filter', 'name=^/evershop$')
    if existing:
        docker('rename', 'evershop', 'evershop-language-failed-20261027')
    docker('rename', OLD, 'evershop')
    docker('start', 'evershop')
    raise
