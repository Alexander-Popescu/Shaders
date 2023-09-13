precision mediump float;

const float FOV = 1.0;
const int MAX_STEPS = 1000;
const float MAX_DIST = 1000.0;
const float HIT_THRESHOLD = 0.0001;

float SDFsphere(vec3 p, vec3 spherePos, float sphereRadius)
{
    return length(p - spherePos) - sphereRadius;
}

float SDFplane(vec3 p, vec3 planePos, vec3 planeNormal)
{
    return dot(p - planePos, planeNormal);
}

vec2 scene(vec3 p)
{
    //returns vec2 where vec2.x is the distance and vec2.y is the object
    
    //sphere in center
    vec3 spherePos = vec3(0.0, 0.0, 3.0);
    float sphereRadius = 1.0;
    int sphereId = 1;
    float sphereDist = SDFsphere(p, spherePos, sphereRadius);

   //plane under it
    vec3 planePos = vec3(0.0, -1.0, 0.0);
    vec3 planeNormal = vec3(0.0, 1.0, 0.0);
    int planeId = 2;
    float planeDist = SDFplane(p, planePos, planeNormal);

    //return union
    if (sphereDist < planeDist)
    {
        return vec2(sphereDist, float(sphereId));
    }
    else
    {
        return vec2(planeDist, float(planeId));
    }
}

vec2 rayMarch(vec3 rayOrigin, vec3 rayDirection)
{
    //returns vec2 where vec2.x is the distance and vec2.y is the object
    vec2 result;
    for (int i = 0; i < MAX_STEPS; i++)
    {
        vec3 p = rayOrigin + rayDirection * result.x;
        vec2 dist = scene(p);
        result.x += dist.x;
        result.y = dist.y;
        if (dist.x < HIT_THRESHOLD || result.x > MAX_DIST)
        {
            break;
        }
    }
    return result;
}

vec3 getNormal(vec3 p)
{
    vec2 e = vec2(HIT_THRESHOLD, 0.0);
    vec3 normal = vec3(
        scene(p + e.xyy).x - scene(p - e.xyy).x,
        scene(p + e.yxy).x - scene(p - e.yxy).x,
        scene(p + e.yyx).x - scene(p - e.yyx).x);
    return normalize(normal);
}

vec3 getMaterial(vec3 hitPos, float id)
{
    if (id == 1.0)
    {
        return vec3(1.0,0.0,0.0);
    }
    else if (id == 2.0)
    {
        return vec3(0.0,0.2,1.0);
    }
    else
    {
        return vec3(0.0, 0.0, 1.0);
    }
}

vec3 light(vec3 hitPos, vec3 rayDirection, float object, vec3 color)
{
    vec3 lightPos = vec3(20.0, 30.0, -30.0);
    vec3 light = normalize(lightPos - hitPos);
    vec3 normal = getNormal(hitPos);
    
    vec3 diffuse = color * clamp(dot(light, normal), 0.0, 1.0);
    //specular
    // vec3 specular = vec3(0.0);
    // if (dot(light, normal) > 0.0)
    // {
    //     vec3 view = normalize(-hitPos);
    //     vec3 halfVector = normalize(light + view);
    //     specular = vec3(1.0) * pow(clamp(dot(normal, halfVector), 0.0, 1.0), 16.0);
    // }
    //return diffuse + specular;

    //shadows
    //value to fix noise on front of objects
    float small_number = 0.01;
    vec2 result = rayMarch(hitPos + normal * small_number, light);
    if (result.x < length(lightPos - hitPos))
    {
        diffuse *= 0.1;
    }
    
    return diffuse;

}

vec3 render(in vec2 uv, in vec3 rayOrigin, in vec3 rayDirection)
{
    vec3 color = vec3(0.0);

    //raymarch
    vec2 result = rayMarch(rayOrigin, rayDirection);
    if (result.x < MAX_DIST)
    {
        //hit
        vec3 hitPos = rayOrigin + rayDirection * result.x;
        vec3 material = getMaterial(hitPos, result.y);
        color += light(hitPos, rayDirection, result.y, material);
    }

    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    //normalize coordinate system so that 0,0 is in the center of the screen
    vec2 uv = (2.0 * fragCoord.xy - iResolution.xy) / iResolution.y;
    
    //color for this pixel
    vec3 color = vec3(1.0);

    //calculate ray for the camera to this pixel
    vec3 rayOrigin = vec3(0.0, 0.0, 0.0);
    vec3 rayDirection = normalize(vec3(uv, FOV));

    color = render(uv, rayOrigin, rayDirection);

    //post processing
    
    //gamma correction
    color = pow(color, vec3(0.4545));

    //send it out
    fragColor = vec4(color, 1.0);
}