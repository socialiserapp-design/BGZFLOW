"""BGZFLOW synthetic recipe schema. No candidate-controlled commands or paths."""
import json


def decode(text):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError('duplicate recipe key')
            result[key] = value
        return result
    value = json.loads(text, object_pairs_hook=unique)
    if not isinstance(value, dict) or set(value) != {'version', 'selection'}:
        raise ValueError('recipe must contain exactly version and selection')
    if type(value['version']) is not int or value['version'] != 1:
        raise ValueError('recipe version must be integer 1')
    if value['selection'] not in ('all', 'omit-last', 'reverse'):
        raise ValueError('unknown recipe selection')
    return value


def encode(selection):
    return json.dumps({'version': 1, 'selection': selection}, sort_keys=True) + '\n'
