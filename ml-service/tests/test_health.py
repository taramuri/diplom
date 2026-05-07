"""Тести для /health endpoint."""


def test_health_returns_200(client):
    response = client.get('/health')
    assert response.status_code == 200


def test_health_response_shape(client):
    response = client.get('/health')
    data = response.json()
    assert 'status' in data
    assert 'model_loaded' in data
    assert 'model_version' in data
    assert 'device' in data


def test_root_returns_metadata(client):
    response = client.get('/')
    assert response.status_code == 200
    assert response.json()['service'] == 'SynthDetect ML'
